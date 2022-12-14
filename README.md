
<img width="602" alt="截屏2022-11-16 17 08 52" src="https://user-images.githubusercontent.com/1460432/202140805-c684eeb1-9733-40e1-b009-0e13d02cb83e.png">

<img width="733" alt="截屏2022-11-16 17 09 17" src="https://user-images.githubusercontent.com/1460432/202140812-4f792aec-0680-4bd6-a047-a8c3a6e61a03.png">
<img width="749" alt="截屏2022-11-16 17 09 25" src="https://user-images.githubusercontent.com/1460432/202140821-fafe40a1-f054-42ed-8391-bc933a50036e.png">


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

### 总体大逻辑
1. 大致分为工厂合约，配对合约，erc20合约，路由合约
2. 核心只需要部署工厂合约，但是为了方便使用，还有一个路由合约配合
3. 工厂合约部署的时候需要设置手续费管理员（可以设为0x00）
4. 工厂合约部署之后，就可以进行创建配对合约的操作
5. 要在交易所中进行交易，操作顺序是：创建pair，添加流动性，交易
6. 添加pair的时候需要提供两个token地址，随后工厂合约会部署一个新的配对合约
7. 部署的时候用的地址是create2方法（assebly）
8. 给token排序，hash，生成salt（需要加入配对合约自己的生成code，保证和其他交易所不冲突）
9. 这样生成的地址就是固定的，可以预测的
10. 用户可以把两个token存入配对合约，然后生成LP token（LP= liquidity provider）
11. 用户可以移除流动性，移除之后，token将返回给用户的adrress
12. 返还数量根据LP token数量和当前token储备进行计算，如果有手续费收益，用户也将得到等比例的收益
13. 用户可以通过一种token交换另一种token，手续费是千分之三（奖励给LP）
14. 路由合约分为两部分（因为代码太多，部署一个合约gas费会超，所以分成两个，但是他们继承的interface都是一样的）

### 添加流动性步骤
1. 判断pair是否存在，如果不存在创建一个
2. 获取原来pair里面两个token的数量
3. 根据token a的数量计算b的配对数量
4. 如果数量不满足最小要求， revert
5. 把计算好的a，b，从用户的账户转入pair合约
1. 记录现在有多少个token0，token1
2. 计算应该mint多少个流动性（公式：原来token0数量 * 原来pair总量 / 现在token0数量）因为是取最小值，这里可能造成微小损耗（如果小数点够多就可以忽略不计）。
3. mint
4. 更新储备

### 销毁流动性步骤
1. 吧用户钱包里的lp token转入pair合约中（路由合约
2. 按照百分比计算应该取走多少token
3. 取走的token两边价值相等
4. 完成取走操作（即把token从pair合约地址转入用户eth地址）
5. 更新储备

### swap的完整流程
1. 要求用户授权需要交易的token数量（授权给路由合约）
2. 计算能得到多少（要收千分之三的流动性提供费用，自动扣除，留在了pair合约的reserve中，在流动性提供者想要移除流动性的时候，会根据他的百分比自动给他分配利润）
3. 由于一些转换是需要a=>b=>c的，所有会计算一个path（前端计算），并且有一个for循环
4. 先转钱，然后调用callback（有一些套利程序，因为是同步，所以会等套利程序完成后，才会继续向下执行）
5. 计算转入的token有多少
6. 验证新的K大于等于老的K
7. 更新储备数量
