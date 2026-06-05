// Browser-only fork of notebookjs v0.8.3 (MIT) — no jsdom / Node paths.
(function () {
  var VERSION = '0.8.3';
  var root = typeof window !== 'undefined' ? window : globalThis;
  var doc = document;

  var ident = function (x) {
    return x;
  };

  var makeElement = function (tag, classNames) {
    var el = doc.createElement(tag);
    el.className = (classNames || [])
      .map(function (cn) {
        return nb.prefix + cn;
      })
      .join(' ');
    return el;
  };

  var escapeHTML = function (raw) {
    return raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  var joinText = function (text) {
    if (text.join) {
      return text.map(joinText).join('');
    }
    return text;
  };

  var nb = {
    prefix: 'nb-',
    markdown: ident,
    ansi: ident,
    sanitizer: ident,
    executeJavaScript: false,
    highlighter: ident,
    VERSION: VERSION,
  };

  nb.Input = function (raw, cell) {
    this.raw = raw;
    this.cell = cell;
  };

  nb.Input.prototype.render = function () {
    if (!this.raw.length) {
      return makeElement('div');
    }
    var holder = makeElement('div', ['input']);
    var cell = this.cell;
    if (typeof cell.number === 'number') {
      holder.setAttribute('data-prompt-number', this.cell.number);
    }
    var preEl = makeElement('pre');
    var codeEl = makeElement('code');
    var notebook = cell.worksheet.notebook;
    var m = notebook.metadata;
    var lang =
      this.cell.raw.language ||
      m.language ||
      (m.kernelspec && m.kernelspec.language) ||
      (m.language_info && m.language_info.name);
    codeEl.setAttribute('data-language', lang);
    codeEl.className = 'lang-' + lang;
    codeEl.innerHTML = nb.highlighter(
      escapeHTML(joinText(this.raw)),
      preEl,
      codeEl,
      lang,
    );
    preEl.appendChild(codeEl);
    holder.appendChild(preEl);
    this.el = holder;
    return holder;
  };

  var imageCreator = function (format) {
    return function (data) {
      var el = makeElement('img', ['image-output']);
      el.src =
        'data:image/' + format + ';base64,' + joinText(data).replace(/\n/g, '');
      return el;
    };
  };

  nb.display = {};
  nb.display.text = function (text) {
    var el = makeElement('pre', ['text-output']);
    el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(joinText(text))), el);
    return el;
  };
  nb.display['text/plain'] = nb.display.text;

  nb.display.html = function (html) {
    var el = makeElement('div', ['html-output']);
    el.innerHTML = nb.sanitizer(joinText(html));
    return el;
  };
  nb.display['text/html'] = nb.display.html;

  nb.display.marked = function (md) {
    return nb.display.html(nb.markdown(joinText(md)));
  };
  nb.display['text/markdown'] = nb.display.marked;

  nb.display.svg = function (svg) {
    var el = makeElement('div', ['svg-output']);
    el.innerHTML = nb.sanitizer(joinText(svg));
    return el;
  };
  nb.display['text/svg+xml'] = nb.display.svg;
  nb.display['image/svg+xml'] = nb.display.svg;

  nb.display.latex = function (latex) {
    var el = makeElement('div', ['latex-output']);
    if (root.renderMathInElement != null) {
      el.innerText = joinText(latex);
      root.renderMathInElement(el, { delimiters: mathDelimiters });
    } else {
      el.innerText = joinText(latex);
    }
    return el;
  };
  nb.display['text/latex'] = nb.display.latex;

  nb.display.javascript = function (js) {
    if (nb.executeJavaScript) {
      var scriptEl = makeElement('script');
      scriptEl.innerHTML = joinText(js);
      return scriptEl;
    }
    var disabledEl = document.createElement('pre');
    disabledEl.innerText = 'JavaScript execution is disabled for this notebook';
    return disabledEl;
  };
  nb.display['application/javascript'] = nb.display.javascript;

  nb.display.png = imageCreator('png');
  nb.display['image/png'] = nb.display.png;
  nb.display.jpeg = imageCreator('jpeg');
  nb.display['image/jpeg'] = nb.display.jpeg;

  nb.display_priority = [
    'png',
    'image/png',
    'jpeg',
    'image/jpeg',
    'svg',
    'image/svg+xml',
    'text/svg+xml',
    'html',
    'text/html',
    'text/markdown',
    'latex',
    'text/latex',
    'javascript',
    'application/javascript',
    'text',
    'text/plain',
  ];

  var renderDisplayData = function () {
    var o = this;
    var formats = nb.display_priority.filter(function (d) {
      return o.raw.data ? o.raw.data[d] : o.raw[d];
    });
    var format = formats[0];
    if (format && nb.display[format]) {
      return nb.display[format](o.raw[format] || o.raw.data[format]);
    }
    return makeElement('div', ['empty-output']);
  };

  var renderError = function () {
    var el = makeElement('pre', ['pyerr']);
    var raw = this.raw.traceback.join('\n');
    el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el);
    return el;
  };

  nb.Output = function (raw, cell) {
    this.raw = raw;
    this.cell = cell;
    this.type = raw.output_type;
  };

  nb.Output.prototype.renderers = {
    display_data: renderDisplayData,
    execute_result: renderDisplayData,
    pyout: renderDisplayData,
    pyerr: renderError,
    error: renderError,
    stream: function () {
      var el = makeElement('pre', [this.raw.stream || this.raw.name]);
      var raw = joinText(this.raw.text);
      el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el);
      return el;
    },
  };

  nb.Output.prototype.render = function () {
    var outer = makeElement('div', ['output']);
    if (typeof this.cell.number === 'number') {
      outer.setAttribute('data-prompt-number', this.cell.number);
    }
    outer.appendChild(this.renderers[this.type].call(this));
    this.el = outer;
    return outer;
  };

  nb.coalesceStreams = function (outputs) {
    if (!outputs.length) {
      return outputs;
    }
    var last = outputs[0];
    var newOutputs = [last];
    outputs.slice(1).forEach(function (o) {
      if (
        o.raw.output_type === 'stream' &&
        last.raw.output_type === 'stream' &&
        o.raw.stream === last.raw.stream &&
        o.raw.name === last.raw.name
      ) {
        last.raw.text = last.raw.text.concat(o.raw.text);
      } else {
        newOutputs.push(o);
        last = o;
      }
    });
    return newOutputs;
  };

  nb.Cell = function (raw, worksheet) {
    var cell = this;
    cell.raw = raw;
    cell.worksheet = worksheet;
    cell.type = raw.cell_type;
    if (cell.type === 'code') {
      cell.number =
        raw.prompt_number > -1 ? raw.prompt_number : raw.execution_count;
      var source = raw.input || [raw.source];
      cell.input = new nb.Input(source, cell);
      var rawOutputs = (cell.raw.outputs || []).map(function (o) {
        return new nb.Output(o, cell);
      });
      cell.outputs = nb.coalesceStreams(rawOutputs);
    }
  };

  var mathDelimiters = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false },
  ];

  nb.Cell.prototype.renderers = {
    markdown: function () {
      var el = makeElement('div', ['cell', 'markdown-cell']);
      var joined = joinText(this.raw.source);
      if (root.renderMathInElement != null) {
        el.innerHTML = nb.sanitizer(joined);
        root.renderMathInElement(el, { delimiters: mathDelimiters });
        el.innerHTML = nb.sanitizer(
          nb.markdown(el.innerHTML.replace(/&gt;/g, '>')),
        );
      } else {
        el.innerHTML = nb.sanitizer(nb.markdown(joined));
      }
      return el;
    },
    heading: function () {
      var el = makeElement('h' + this.raw.level, ['cell', 'heading-cell']);
      el.innerHTML = nb.sanitizer(joinText(this.raw.source));
      return el;
    },
    raw: function () {
      var el = makeElement('div', ['cell', 'raw-cell']);
      el.innerHTML = escapeHTML(joinText(this.raw.source));
      return el;
    },
    code: function () {
      var cellEl = makeElement('div', ['cell', 'code-cell']);
      cellEl.appendChild(this.input.render());
      this.outputs.forEach(function (o) {
        cellEl.appendChild(o.render());
      });
      return cellEl;
    },
  };

  nb.Cell.prototype.render = function () {
    var el = this.renderers[this.type].call(this);
    this.el = el;
    return el;
  };

  nb.Worksheet = function (raw, notebook) {
    var worksheet = this;
    this.raw = raw;
    this.notebook = notebook;
    this.cells = raw.cells.map(function (c) {
      return new nb.Cell(c, worksheet);
    });
    this.render = function () {
      var worksheetEl = makeElement('div', ['worksheet']);
      worksheet.cells.forEach(function (c) {
        worksheetEl.appendChild(c.render());
      });
      this.el = worksheetEl;
      return worksheetEl;
    };
  };

  nb.Notebook = function (raw, config) {
    var notebook = this;
    this.raw = raw;
    this.config = config;
    var meta = (this.metadata = raw.metadata || {});
    this.title = meta.title || meta.name;
    var worksheets = raw.worksheets || [{ cells: raw.cells }];
    this.worksheets = worksheets.map(function (ws) {
      return new nb.Worksheet(ws, notebook);
    });
    this.sheet = this.worksheets[0];
  };

  nb.Notebook.prototype.render = function () {
    var notebookEl = makeElement('div', ['notebook']);
    this.worksheets.forEach(function (w) {
      notebookEl.appendChild(w.render());
    });
    this.el = notebookEl;
    return notebookEl;
  };

  nb.parse = function (nbjson, config) {
    return new nb.Notebook(nbjson, config);
  };

  module.exports = nb;
})();
