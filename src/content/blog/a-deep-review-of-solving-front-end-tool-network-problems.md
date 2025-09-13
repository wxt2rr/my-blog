---
title: npx 网络问题排查纪实：从 ENOTFOUND 到 SSL_ERROR_SYSCALL
date: 2025-09-13 10:38
keywords: ["ENOTFOUND", "SSL_ERROR_SYSCALL", "npx @tiptap/cli", "getaddrinfo", "Node.js", "网络代理", "DNS解析"]
featured: true
summary: 近期在项目中集成 `Tiptap` 时，执行官方的脚手架命令遇到了一个持续了较长时间的网络问题。整个排查过程涉及到多个层面，最终定位到了一个由特定工具 Bug 和网络环境共同导致的问题。在此记录完整的思考和解决过程，希望能为遇到类似问题的开发者提供参考。
---

### 一、问题的起点：ENOTFOUND 错误与初步诊断

问题始于执行以下 `npx` 命令：

```bash
npx @tiptap/cli@latest add simple-editor
```

终端返回了明确的错误信息：

```
Something went wrong. ...
request to [https://template.tiptap.dev/r/index.json](https://template.tiptap.dev/r/index.json) failed, reason: getaddrinfo ENOTFOUND template.tiptap.dev
```

`getaddrinfo ENOTFOUND` 是一个非常典型的 DNS 解析失败错误。然而，当我尝试将报错的 URL `https://template.tiptap.dev/r/index.json` 在浏览器中打开时，却可以被顺利访问并获取到有效的 JSON 数据。

这个现象令人困惑：同一个网络环境下，为何浏览器和终端的网络请求行为存在差异？为了定位问题，我在终端中执行了基础的网络诊断命令：

1. `ping template.tiptap.dev`：执行失败，提示 `Unknown host`。
2. `nslookup template.tiptap.dev`：执行成功，并返回了正确的 IP 地址。

`nslookup` 的成功表明上游 DNS 服务器是可用的。而 `ping` 的失败则暗示 macOS 的系统级 DNS 解析服务可能存在配置问题。通过检查 `nslookup` 的输出，我注意到其使用的 DNS 服务器为 IPv6 地址，这在某些网络环境中可能导致解析不稳定。

基于此判断，我在系统的网络设置中，手动添加了 `8.8.8.8` 作为一个优先的 IPv4 DNS 服务器。完成设置后，再次执行 `curl https://template.tiptap.dev/r/index.json`，命令成功返回了数据。至此，终端的基础网络环境得到修复，当时我认为问题已经解决。



### 二、深入排查：系统网络正常，但 Node.js 环境依然异常



然而，当我再次满怀信心地运行 `npx @tiptap/cli@latest add simple-editor` 命令时，终端返回了完全相同的 `ENOTFOUND` 错误。

这个结果让我十分意外。`curl` 的成功证明了系统层面的网络连接和 DNS 解析均已恢复正常，那么问题范围必然可以缩小到 `npx` 或 `Node.js` 的运行时环境。为了探究 `npx` 命令执行期间的真实网络行为，我启动了网络代理软件并开始监控其连接日志。

日志分析带来了决定性的发现。`npx` 命令的执行过程包含两个独立的网络阶段：

1. **阶段一**：`npx` 工具从 `registry.npmjs.org` 下载 `@tiptap/cli` 包。此请求在代理日志中有明确记录，确认其遵循了系统代理设置。
2. **阶段二**：下载完成的 `@tiptap/cli` 脚本开始执行，并请求 `template.tiptap.dev`。此请求在代理日志中**完全没有记录**。

这一点明确地揭示了问题所在：**`@tiptap/cli` 这个 Node.js 进程没有使用系统配置的代理，而是发起了直接连接（Direct Connection）。** 由于我的网络环境中，直连路径的 DNS 解析不够稳定（即第一步中遇到的问题），导致这个直连请求最终失败。



### 三、意外发现：由 Anaconda 引起的环境问题



既然确定了问题是部分进程未通过代理，我首先想到了使用 `proxychains-ng` 工具来强制劫持 `npx` 进程的流量。

然而，在测试 `proxychains-ng` 本身时，又遇到了新的问题。执行 `proxychains4 curl -v https://www.google.com` 命令失败，并返回了一个全新的错误：`OpenSSL SSL_connect: SSL_ERROR_SYSCALL`。

这是一个 SSL/TLS 握手阶段的错误。通过 `curl -v` 的详细输出，我注意到一行关键信息：`* CAfile: /opt/anaconda3/ssl/cacert.pem`。同时，我也意识到我的终端提示符一直带有 `(base)` 前缀。

这两条线索共同指向了 `Anaconda`。我的 Shell 环境受到了 Anaconda 的影响，它重写了系统的 SSL 证书信任链。当 `proxychains-ng` 尝试通过代理进行 HTTPS 通信时，代理软件执行了中间人解密/加密，而系统（由于 Anaconda 的配置）不信任代理的证书，从而导致了 SSL 握手失败。

虽然这并非 `ENOTFOUND` 问题的直接原因，但它提醒了我：**必须警惕 `conda` 等环境管理工具，它们可能在不知不觉中修改了系统底层行为，为问题排查引入了额外的变量。**



### 四、定位根源与最终解决方案



在排除了 `Anaconda` 的干扰后，问题焦点回归到 `@tiptap/cli` 在代理环境下的异常行为。为了构建一个最小化的复现环境，我编写了一个简单的 Node.js 脚本，用以测试所有可能的网络路径：

1. 不设置代理，直接 `fetch` 目标 URL -> **测试通过**。
2. 设置代理，通过代理 `fetch` 目标 URL -> **测试也通过**。

这个测试结果推翻了之前的“Node.js 无法直连”的猜想，并揭示了问题的最终根源：

- **根本原因**：`@tiptap/cli` 工具在代码层面存在缺陷。当它检测到 `HTTPS_PROXY` 等代理环境变量时，其内部逻辑会产生混乱：对于 `registry.npmjs.org` 的请求会正确使用代理，但对于 `template.tiptap.dev` 的请求却会错误地回退（Fallback）到直接连接。
- **触发条件**：我的网络环境恰好在直连路径上存在 DNS 解析不稳定的问题，这个“被回退”的直连请求因此失败。

既然问题的本质是“程序 Bug + 不稳定的直连 DNS”，那么解决方案的目标就非常清晰了：**创造一个能让程序稳定运行的环境，规避其 Bug。**

由于 Node.js 本身可以直连，我们只需确保直连路径的 DNS 解析对 Node.js 稳定，并移除会触发 Bug 的代理环境变量即可。

最终解决方案如下：

Bash

```
# 1. 取消代理环境变量，避免触发 Tiptap CLI 的 Bug
unset HTTPS_PROXY HTTP_PROXY

# 2. 通过 NODE_OPTIONS 强制 Node.js 在直连时优先使用 IPv4 进行 DNS 解析，以保证稳定性
export NODE_OPTIONS=--dns-result-order=ipv4first

# 3. 重新执行命令
npx @tiptap/cli@latest add simple-editor
```

执行后，命令成功运行，问题得到解决。



### 五、总结与反思



本次排错过程虽然复杂，但遵循了层层递进的逻辑，以下是几点核心总结：

1. **分层验证是关键**：从系统层（`ping`, `curl`）到应用层（`Node.js` 脚本），逐步缩小问题范围，是高效排错的基础。
2. **日志是定位问题的直接证据**：若没有通过代理日志观察到 `@tiptap/cli` 的直连行为，排错方向可能会停留在对 Node.js 代理配置的反复尝试上。
3. **警惕环境配置的隐性影响**：`conda` 等环境管理工具可能会修改 SSL 证书链等底层配置，在排查网络或安全相关问题时，应将其作为潜在的检查点。
4. **深入理解错误信息背后的逻辑**：`ENOTFOUND` 只是问题的表象，其背后是应用程序逻辑缺陷和特定网络环境共同作用的结果。