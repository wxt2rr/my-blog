---
title: sentinel组件使用
date: 2023-06-06 14:38
keywords: ["cookie", "session"]
featured: true
summary: Java项目引入sentinel组件常见的几种方式
---

[官网地址]([open-source-framework-integrations | Sentinel (sentinelguard.io)](https://sentinelguard.io/zh-cn/docs/open-source-framework-integrations.html))

# Client端配置

## Servlet项目

如果你的项目是普通的Servlet项目的话，使用以下方式接入

~~~xml
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-web-servlet</artifactId>
    <version>x.y.z</version>
</dependency>
~~~

必须添加sentinel自带的Filter，在xml配置

~~~xml
<filter>
	<filter-name>SentinelCommonFilter</filter-name>
	<filter-class>com.alibaba.csp.sentinel.adapter.servlet.CommonFilter</filter-class>
</filter>

<filter-mapping>
	<filter-name>SentinelCommonFilter</filter-name>
	<url-pattern>/*</url-pattern>
</filter-mapping>
~~~

如果是SpringBoot项目的话可以通过Bean注入

~~~java
@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean sentinelFilterRegistration() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new CommonFilter());
        registration.addUrlPatterns("/*");
        registration.setName("sentinelFilter");
        registration.setOrder(1);

        return registration;
    }
}
~~~

## SpringMVC项目

### HTTP

如果是SpringMvc项目的话，sentinel提供了专门的适配器

~~~xml
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-spring-webmvc-adapter</artifactId>
    <version>1.8.5</version>
</dependency>
~~~

~~~java
@Configuration
public class SentinelWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SentinelWebInterceptor()).addPathPatterns("/**");
    }
}
~~~

需要手动注入SentinelWebIntercepor

### Dubbo

~~~xml
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-apache-dubbo-adapter</artifactId>
    <version>1.8.5</version>
</dependency>
~~~

不需要其它配置，请求项目的RPC请求会自动被捕获

## SpringCloud项目

直接引入对应的starter，所有组件一应俱全，不需要其它配置

~~~xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
~~~

# DashBoard配置

## 通过properties文件

这种必须引入starter组件

~~~xml
spring.cloud.sentinel.transport.port=8719
spring.cloud.sentinel.transport.dashboard=https://xxxxx
~~~

## 通过JAVA -D

~~~sh
-Dproject.name=xxxx \
-Dcsp.sentinel.dashboard.server=xxxx \
-Dcsp.sentinel.api.port=8719 \
~~~

# 全局处理

## HTTP

**可以使用静态方法注入，也可以使用Bean注入**

如果使用的是mvc-adapter，可以定义统一处理Handler

~~~java
@Component
public class SentinelHttpBlockExceptionHandler implements BlockExceptionHandler {

@Override
public void handle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, BlockException e) throws Exception {
    String msg = "服务正常响应";
    int code = 200;
    if (e instanceof FlowException) {
        msg = "当前请求过于频繁，请求已被限流";
        code = -40000;
    } else if (e instanceof DegradeException) {
        msg = "当前服务运行异常，服务已被降级";
        code = -40001;
    }

    Map<String, Object> bodyMap = new HashMap<>(3);
    bodyMap.put("code", code);
    bodyMap.put("msg", msg);
    bodyMap.put("data", System.currentTimeMillis());

    Map<String, Object> headerMap = new HashMap<>(1);
    headerMap.put("code", 1);

    Map<String, Object> resultMap = new HashMap<>(2);
    resultMap.put("body", bodyMap);
    resultMap.put("header", headerMap);

    httpServletResponse.setStatus(200);
    httpServletResponse.setCharacterEncoding("utf-8");
    httpServletResponse.setHeader("Content-Type", "application/json:charset=utf-8");
    httpServletResponse.setContentType("application/json:charset=utf-8");
    new ObjectMapper().writeValue(httpServletResponse.getWriter(), resultMap);
}
~~~

如果使用的web-servlet

~~~java
{
    WebCallbackManager.setUrlBlockHandler((httpServletRequest, httpServletResponse, e) -> {
        String msg = "服务正常响应";
        int code = 200;
        if (e instanceof FlowException) {
            msg = "当前请求过于频繁，请求已被限流";
            code = -40000;
        } else if (e instanceof DegradeException) {
            msg = "当前服务运行异常，服务已被降级";
            code = -40001;
        }

        Map<String, Object> bodyMap = new HashMap<>(3);
        bodyMap.put("code", code);
        bodyMap.put("msg", msg);
        bodyMap.put("data", System.currentTimeMillis());

        Map<String, Object> headerMap = new HashMap<>(1);
        headerMap.put("code", 1);

        Map<String, Object> resultMap = new HashMap<>(2);
        resultMap.put("body", bodyMap);
        resultMap.put("header", headerMap);

        httpServletResponse.setStatus(200);
        httpServletResponse.setCharacterEncoding("utf-8");
        httpServletResponse.setHeader("Content-Type", "application/json:charset=utf-8");
        httpServletResponse.setContentType("application/json:charset=utf-8");
        new ObjectMapper().writeValue(httpServletResponse.getWriter(), resultMap);
    });
}
~~~

## Dubbo

~~~java
{
    DubboAdapterGlobalConfig.setProviderFallback((invoker, invocation, e) -> {
        if (e instanceof FlowException) {
            System.out.println("service 2 服务被限流了");
        } else if (e instanceof DegradeException) {
            System.out.println("service 2 服务被降级了");
        }


        String obj = "service 异常响应";
        return AsyncRpcResult.newDefaultAsyncResult(obj, invocation);
    });
}
~~~



# 备注

使用最新的fastjson

~~~xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>fastjson</artifactId>
    <version>1.2.83</version>
</dependency>
~~~



