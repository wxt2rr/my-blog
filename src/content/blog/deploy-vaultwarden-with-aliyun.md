---
title: 使用阿里云云函数部署Vaultwarden
date: 2025-08-11 17:38
keywords: ["Vaultwarden", "云函数", "Bitwarden", "1Password"]
featured: true
summary: 在阿里云的服务器到期了，其它的服务基本都是静态的，迁移到其它云商了，但是之前使用的密码管理器Bitwarden需要部署后端服务，又不值当的单独买一个服务器部署，所以选择了云函数这个方案，特别适合这种按量付费的场景
---

> [Bitwarden 最值得信赖的开源密码管理器](https://bitwarden.com/)
>
> [Vaultwarden 是一个使用 Rust 编写的非官方 Bitwarden 服务器实现，与官方 Bitwarden 客户端兼容，比官方服务器轻量](https://rs.ppgg.in/home)

## 一、上传Vaultwarden镜像到阿里云

1. 登录阿里云容器镜像服务，创建个人版实例https://cr.console.aliyun.com/cn-beijing/instances
1. 创建完成之后从本地推送Vaultwarden的镜像到阿里云镜像服务（在Pull镜像时最好指定镜像的打包平台，不然可能因为打包的镜像和运行环境不兼容，可能在阿里云函数里跑不起来）

```shell
docker pull --platform=linux/amd64 vaultwarden/server:latest
docker login --username= crpi-bufxxxxx01.cn-beijing.personal.cr.aliyuncs.com
docker tag [ImageId] crpi-bufxxxxx01.cn-beijing.personal.cr.aliyuncs.com/wangxt0223/common:[镜像版本号]
docker push crpi-bufxxxxx01.cn-beijing.personal.cr.aliyuncs.com/wangxt0223/common:[镜像版本号]
```

## 二、创建角色

1. 登录阿里云RAM访问控制https://ram.console.aliyun.com/roles/create
2. 创建角色
   1. 信任主体类型：云服务
   2. 信任主体名称：函数计算
   3. 角色名称：`AliyunFcDefaultRole`
   4. 权限策略：`AliyunOSSFullAccess`、`AliyunFCDefaultRolePolicy`

## 三、创建阿里云函数

1. 创建函数 -> Web函数

2. 填写创建表单

   1. 函数名称：按照规则自己随便写
   2. 规则方案：`vCPU` 0.1 `内存` 128M `磁盘`512M `并发` 20
   3. 弹性模式：`极速模式`
   4. 运行环境：自定义镜像 -> 使用ACR中的镜像 -> 选择ACR中的镜像 -> 选择刚刚自己上传的镜像
   5. 启动命令：不需要填
   6. 监听端口：`80`
   7. 执行超时时间：`60`
   8. 标签：随意
   9. 时区：`北京时间`
   10. 函数角色：`AliyunFcDefaultRole`
   11. 允许访问VPC：`否`、允许函数默认网卡访问公网：`是`、日志功能：`否` 

3. 其它配置

   1. 环境变量，根据自己的需求添加，[Vaultwarden配置参考](https://host.ppgg.in/vaultwarden/configuration)

      | 变量名                | 值           |
      | --------------------- | ------------ |
      | `DATA_FOLDER`         | `/mnt/data/` |
      | `ENABLE_DB_WAL`       | `false`      |
      | `ENABLE_WEBSOCKET`    | `false`      |
      | `INVITATIONS_ALLOWED` | `false`      |
      | `SIGNUPS_ALLOWED`     | `false`      |

   2. 挂载 OSS 对象存储

      1. Bucket，选择自己的Bucket
      2. 子目录：`/mnt/`
      3. OSS访问地址：`默认地址`
      4. 函数本地目录：`/mnt/data/`
      5. 函数本地目录权限：`读写`

## 四、测试

访问触发器的公网访问地址：https://bit-xxxxxx.cn-beijing.fcapp.run，响应一个html说明成功了

## 五、绑定自定义域名

返回函数计算控制台，选择「`域名管理`」，添加自定义域名，然后将公网CNAME配置到自己定义域名的解析即可

## 六、告警

一定要加告警，别问为什么