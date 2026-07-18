import bridgeSource from './pythonKernelBridge.py';

/** Python kernel bridge 源码；启动时写入临时文件供 python 执行 */
export const PYTHON_KERNEL_BRIDGE_SOURCE: string = bridgeSource;
