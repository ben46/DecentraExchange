![dffd](https://miro.medium.com/max/1400/1*dqN-Wz9-XZGG6lijEPoJMw.png)


### 去中心化交易所

这是一个仿uniswap的去中心化交易所。系统是基于以太坊网络开发的。前端部分代码是react写的，用的语言是javascript。开发环境工具用的是hardhat,选择他是因为灵活度更高，可以同时设置不同版本的solc

### 功能
主要功能有交易，流动性挖矿，询价，创建交易对等等。
1. 可以进行eth=>ERC20 token交易
2. 可以进行ERC20 token=>eth交易
3. 可以进行ERC20 token=>token交易
4. 交易询价
5. 获取账户余额
6. 添加流动性
7. 移除流动性
8. 流动性询价

### 文件目录

1. 智能合约/contracts里面放了智能合约代码，包括工厂合约，配对合约，路由合约，WETH合约（ETH的ERC20形式，方便交易），以及一些安全数学计算库，和一些合约的接口代码
2. 智能合约/contracts/arifacts里面放了编译之后的ABI json，可以拷贝到前端代码中，方便前端调用
3. 智能合约/scripts/deploy.js是部署代码，部署到本地，测试环境或者生产环境（还没写好）
4. 智能合约/test里面是测试代码， 运行`npx hardhat test`可以对智能合约进行测试
5. 前端/src/ethereumFunctions.js里面是一些主要的访问以太坊网络的方法（询价，交易，钱包余额）
6. 前端/src/LiquidityFunctions.js里面是和流动性相关的一些函数封装（添加，移除，询价）

