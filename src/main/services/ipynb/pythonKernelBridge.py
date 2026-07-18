#!/usr/bin/env python3
"""Muled Python kernel bridge — newline-delimited JSON on stdin/stdout."""
from __future__ import annotations

import base64
import json
import sys
import traceback
import io
from contextlib import contextmanager

EXECUTION_COUNT = 0
_GLOBALS: dict = {}
# 协议行必须写到真实 stdout，不能在 _hijack_stdio 期间走被替换的 sys.stdout
_PROTOCOL_STDOUT = sys.__stdout__


def _emit(msg):
    _PROTOCOL_STDOUT.write(json.dumps(msg, ensure_ascii=False) + "\n")
    _PROTOCOL_STDOUT.flush()


class _StreamEmitter(io.TextIOBase):
    """实时推送 stdout/stderr；缓冲小分片，减少 IPC 与内存压力。"""

    def __init__(self, name: str, cell_id: str):
        self._name = name
        self._cell_id = cell_id
        self._buf = ""

    def write(self, s: str) -> int:
        if not s:
            return 0
        self._buf += s
        if (
            len(self._buf) >= 256
            or "\n" in s
            or "\r" in s
            or "\x1b" in s
        ):
            self._flush_buf()
        return len(s)

    def flush(self) -> None:
        self._flush_buf()

    def _flush_buf(self) -> None:
        if not self._buf:
            return
        _emit(
            {
                "type": "stream",
                "cell_id": self._cell_id,
                "name": self._name,
                "text": self._buf,
            }
        )
        self._buf = ""

    def isatty(self) -> bool:
        return True

    @property
    def encoding(self) -> str:
        return "utf-8"

    def fileno(self) -> int:
        return 2 if self._name == "stderr" else 1


def _make_error(exc_type, exc_value, exc_tb):
    return {
        "output_type": "error",
        "ename": getattr(exc_type, "__name__", str(exc_type)),
        "evalue": str(exc_value),
        "traceback": traceback.format_exception(exc_type, exc_value, exc_tb),
    }


def _safe_data(data: dict) -> dict:
    out = {}
    for key, value in data.items():
        if isinstance(value, bytes):
            out[key] = base64.b64encode(value).decode("ascii")
        elif isinstance(value, (list, tuple)):
            out[key] = [
                base64.b64encode(v).decode("ascii") if isinstance(v, bytes) else v
                for v in value
            ]
        else:
            out[key] = value
    return out


def _try_ipython():
    try:
        from IPython.core.interactiveshell import InteractiveShell
        from IPython.utils.capture import capture_output

        shell = InteractiveShell.instance()
        try:
            shell.run_line_magic("matplotlib", "inline")
        except Exception:
            pass
        return shell, capture_output
    except Exception:
        return None, None


SHELL, CAPTURE = _try_ipython()


def _patch_tqdm_for_stdio():
    """IPython 下 tqdm.auto 会走 notebook 小部件，改为终端 stderr 模式。"""
    try:
        import tqdm.auto as tqdm_auto
        from tqdm.std import tqdm as std_tqdm

        def std_only_tqdm(*args, **kwargs):
            if "file" not in kwargs:
                kwargs["file"] = sys.stderr
            return std_tqdm(*args, **kwargs)

        tqdm_auto.tqdm = std_only_tqdm
        import tqdm as tqdm_pkg

        tqdm_pkg.tqdm = std_only_tqdm
    except Exception:
        pass


_patch_tqdm_for_stdio()


@contextmanager
def _hijack_stdio(cell_id: str):
    """同时替换 sys 与 IPython.io，否则 run_cell 内 tqdm 仍写向旧流。"""
    stream_out = _StreamEmitter("stdout", cell_id)
    stream_err = _StreamEmitter("stderr", cell_id)
    old_sys = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = stream_out, stream_err
    saved_io = None
    if SHELL is not None and hasattr(SHELL, "io"):
        saved_io = (SHELL.io.stdout, SHELL.io.stderr)
        SHELL.io.stdout = stream_out
        SHELL.io.stderr = stream_err
    try:
        yield stream_out, stream_err
    finally:
        stream_out.flush()
        stream_err.flush()
        sys.stdout, sys.stderr = old_sys
        if saved_io is not None:
            SHELL.io.stdout, SHELL.io.stderr = saved_io


def _collect_matplotlib_figure_outputs():
    """matplotlib-inline 常在 run_cell 结束后才 flush 图像；兜底抓取未发布的 figure。"""
    outputs = []
    try:
        import matplotlib._pylab_helpers as pylab_helpers
        from matplotlib.backends.backend_agg import FigureCanvasAgg
    except ImportError:
        return outputs

    managers = list(pylab_helpers.Gcf.get_all_fig_managers())
    for manager in managers:
        try:
            fig = manager.canvas.figure
            buf = io.BytesIO()
            FigureCanvasAgg(fig).print_png(buf)
            data = base64.b64encode(buf.getvalue()).decode("ascii")
            outputs.append(
                {
                    "output_type": "display_data",
                    "data": {"image/png": data},
                    "metadata": {},
                }
            )
        except Exception:
            pass
        finally:
            try:
                pylab_helpers.Gcf.destroy(manager)
            except Exception:
                pass
    return outputs


def execute_ipython(code: str, cell_id: str):
    global EXECUTION_COUNT
    EXECUTION_COUNT += 1
    outputs = []
    display_pub = SHELL.display_pub
    old_publish = display_pub.publish
    had_image = False

    def publish(data, metadata=None, transient=None, **kwargs):
        nonlocal had_image
        if metadata is None:
            metadata = {}
        if "image/png" in data or "image/jpeg" in data:
            had_image = True
        payload = {
            "output_type": "display_data",
            "data": _safe_data(data),
            "metadata": metadata,
        }
        _emit(
            {
                "type": "display",
                "cell_id": cell_id,
                "output": payload,
            }
        )
        return None

    display_pub.publish = publish
    result = None
    try:
        with _hijack_stdio(cell_id):
            result = SHELL.run_cell(code, store_history=False)
        if not had_image:
            outputs.extend(_collect_matplotlib_figure_outputs())
        if result is not None and result.error_in_exec is not None:
            err = result.error_in_exec
            outputs.append(_make_error(type(err), err, err.__traceback__))
        elif result is not None and result.result is not None:
            outputs.append(
                {
                    "output_type": "execute_result",
                    "data": {"text/plain": repr(result.result)},
                    "metadata": {},
                    "execution_count": EXECUTION_COUNT,
                }
            )
        status = "error" if result is not None and result.error_in_exec else "ok"
    finally:
        display_pub.publish = old_publish
    return {
        "execution_count": EXECUTION_COUNT,
        "outputs": outputs,
        "status": status,
    }


def execute_plain(code: str, cell_id: str):
    global EXECUTION_COUNT
    EXECUTION_COUNT += 1
    outputs = []
    try:
        with _hijack_stdio(cell_id):
            exec(compile(code, "<cell>", "exec"), _GLOBALS)
        status = "ok"
    except Exception as exc:
        outputs.append(_make_error(type(exc), exc, exc.__traceback__))
        status = "error"
    return {
        "execution_count": EXECUTION_COUNT,
        "outputs": outputs,
        "status": status,
    }


def handle_execute(req):
    code = req.get("code", "")
    cell_id = req.get("cell_id")
    if SHELL is not None and CAPTURE is not None:
        resp = execute_ipython(code, cell_id)
    else:
        resp = execute_plain(code, cell_id)
    resp["type"] = "execute_reply"
    resp["cell_id"] = req.get("cell_id")
    return resp


_SKIP_VAR_NAMES = frozenset(
    {
        "In",
        "Out",
        "_",
        "_i",
        "_ii",
        "_iii",
        "_oh",
        "_dh",
        "get_ipython",
        "exit",
        "quit",
        "open",
        "help",
    }
)


def _format_var_value(val, max_len=120):
    try:
        text = repr(val)
    except Exception:
        text = "<无法表示>"
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def _get_namespace():
    if SHELL is not None:
        return SHELL.user_ns
    return _GLOBALS


def _should_show_variable(name, val):
    if not isinstance(name, str) or name.startswith("_"):
        return False
    if name in _SKIP_VAR_NAMES:
        return False
    mod = getattr(type(val), "__module__", None)
    if mod == "builtins" and callable(val):
        return False
    return True


def _get_memory_bytes():
    try:
        import resource

        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform == "darwin":
            return int(rss)
        return int(rss) * 1024
    except Exception:
        return None


def handle_inspect(req):
    ns = _get_namespace()
    variables = []
    for name in sorted(ns.keys(), key=lambda key: str(key)):
        val = ns.get(name)
        if not _should_show_variable(name, val):
            continue
        variables.append(
            {
                "name": str(name),
                "type": type(val).__name__,
                "value": _format_var_value(val),
            }
        )
    return {
        "type": "inspect_reply",
        "request_id": req.get("request_id"),
        "memory_bytes": _get_memory_bytes(),
        "variables": variables,
    }


def main():
    ready = {
        "type": "ready",
        "has_ipython": SHELL is not None,
    }
    _emit(ready)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        msg_type = req.get("type")
        if msg_type == "shutdown":
            break
        if msg_type == "ping":
            _emit({"type": "pong", "has_ipython": SHELL is not None})
            continue
        if msg_type == "execute":
            _emit(handle_execute(req))
            continue
        if msg_type == "inspect":
            _emit(handle_inspect(req))


if __name__ == "__main__":
    main()
