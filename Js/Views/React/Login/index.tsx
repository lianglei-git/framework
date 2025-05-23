import React from 'react';

const LoginView: React.FC = () => {
  const togglePasswordVisibility = () => {
    // 实现密码显示/隐藏逻辑
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 实现登录逻辑
  };

  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>登录页面</title>
        <script src="https://cdn.tailwindcss.com" />
        <link
          rel="stylesheet"
          href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <style>
          {`
            body {
              background-color: #f8f9fa;
            }
            .input-field:focus {
              border-color: #0069D9;
              box-shadow: 0 0 0 2px rgba(0, 105, 217, 0.2);
            }
            .login-btn:hover {
              background-color: #0069D9;
              transform: translateY(-1px);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
          `}
        </style>
      </head>
      <body className="min-h-screen flex items-center justify-center p-4">
        <div
          className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row"
        >
          {/* 左侧区域 */}
          <div
            className="w-full md:w-1/2 bg-blue-50 p-8 flex flex-col items-center justify-center"
          >
            <img
              src="https://aidev.gemcoder.com/staticResource/echoAiSystemImages/dd8775e6a30211347a85adaeba5b96f9.png"
              alt="Welcome Illustration"
              className="w-full h-64 object-contain"
            />
            <div className="mt-8 w-full">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">我的分类</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm flex items-center">
                  <i className="fas fa-sticky-note text-blue-500 mr-2" />
                  <span className="text-sm"> Memo </span>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex items-center">
                  <i className="fas fa-car text-green-500 mr-2" />
                  <span className="text-sm"> 驾考 </span>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex items-center">
                  <i className="fas fa-umbrella-beach text-yellow-500 mr-2" />
                  <span className="text-sm"> Japan Traveling </span>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex items-center">
                  <i className="fas fa-book text-purple-500 mr-2" />
                  <span className="text-sm"> 学习笔记 </span>
                </div>
              </div>
            </div>
          </div>
          {/* 右侧登录区域 */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Login</h2>
            <p className="text-gray-500 mb-8">Enter your username</p>
            <form id="loginForm" className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  User
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="请输入用户名"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg input-field focus:outline-none"
                    required
                  />
                  <i className="fas fa-user absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="请输入密码"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg input-field focus:outline-none"
                    required
                  />
                  <i
                    id="togglePassword"
                    className="fas fa-eye absolute right-3 top-3 text-gray-400 cursor-pointer hover:text-gray-600"
                    title="Show Password"
                    onClick={togglePasswordVisibility}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    name="remember"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember Password
                    <span className="text-xs text-gray-500"> (下次自动登录) </span>
                  </label>
                </div>
                <a
                  href="javascript:void(0);"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Forget Password?
                </a>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg login-btn transition-all duration-200"
              >
                LOGIN
              </button>
            </form>
            <div className="mt-8">
              <p className="text-center text-gray-500 mb-3">Login With</p>
              <div className="flex justify-center space-x-6">
                <a
                  href="javascript:void(0);"
                  className="text-gray-500 hover:text-blue-500"
                >
                  <i className="fab fa-google text-2xl" title="Google" />
                </a>
                <a
                  href="javascript:void(0);"
                  className="text-gray-500 hover:text-blue-500"
                >
                  <i className="fab fa-apple text-2xl" title="Apple" />
                </a>
                <a
                  href="javascript:void(0);"
                  className="text-gray-500 hover:text-blue-500"
                >
                  <i className="fab fa-weixin text-2xl" title="WeChat" />
                </a>
              </div>
            </div>
            <div
              className="mt-8 pt-4 border-t border-gray-200 flex justify-center space-x-4"
            >
              {/* 原代码未结束，这里保留结构 */}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

export default LoginView;