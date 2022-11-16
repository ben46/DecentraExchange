import { Contract, ethers } from "ethers";
import * as chains from "./constants/chains";
import COINS from "./constants/coins";

const ROUTER = require("./build/UniswapV2Router02.json");
const ERC20 = require("./build/ERC20.json");
const FACTORY = require("./build/IUniswapV2Factory.json");
const PAIR = require("./build/IUniswapV2Pair.json");

export function getProvider() {
  return new ethers.providers.Web3Provider(window.ethereum);
}

export function getSigner(provider) {
  return provider.getSigner();
}

export async function getNetwork(provider) {
  const network = await provider.getNetwork();
  return network.chainId;
}

export function getRouter(address, signer) {
  return new Contract(address, ROUTER.abi, signer);
}

export async function checkNetwork(provider) {
  const chainId = getNetwork(provider);
  if (chains.networks.includes(chainId)){
    return true
  }
  return false;
}

export function getWeth(address, signer) {
  return new Contract(address, ERC20.abi, signer);
}

export function getFactory(address, signer) {
  return new Contract(address, FACTORY.abi, signer);
}

export async function getAccount() {
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  return accounts[0];
}

//此函数检查给定地址是否存在 ERC20 代币
export function doesTokenExist(address, signer) {
  try {
    return new Contract(address, ERC20.abi, signer);
  } catch (err) {
    return false;
  }
}

export async function getDecimals(token) {
  const decimals = await token.decimals().then((result) => {
      return result;
    }).catch((error) => {
      console.log('No tokenDecimals function for this token, set to 0');
      return 0;
    });
    return decimals;
}

//此函数返回一个包含 2 个字段的对象：`balance` 容器是特定令牌中的帐户余额，以及 `symbol` 是令牌名称的缩写。 为了正常工作，它必须提供 4 个参数：
export async function getBalanceAndSymbol(
  accountAddress,
  address,
  provider,
  signer,
  weth_address,
  coins
) {
  try {
    if (address === weth_address) {
      const balanceRaw = await provider.getBalance(accountAddress);

      return {
        balance: ethers.utils.formatEther(balanceRaw),
        symbol: coins[0].abbr,
      };
    } else {
      const token = new Contract(address, ERC20.abi, signer);
      const tokenDecimals = await getDecimals(token);
      const balanceRaw = await token.balanceOf(accountAddress);
      const symbol = await token.symbol();

      return {
        balance: balanceRaw*10**(-tokenDecimals),
        symbol: symbol,
      };
    }
  } catch (error) {
    console.log ('The getBalanceAndSymbol function had an error!');
    console.log (error)
    return false;
  }
}

// 此功能交换两个特定的代币/AUT，它可以处理从 AUT 到 ERC20 代币、ERC20 到 AUT 和 ERC20 到 ERC20 代币的切换。
// 没有进行错误处理，因此可以使用 .catch() 防止错误溢出
//    `amount` - 一个浮点数或类似数字，表示要交易的 address1 代币的价值
//    `routerContract` - 路由合约
//    `accountAddress` - 当前用户账户的以太坊地址
//    `signer` - 当前签名者
export async function swapTokens(
  address1,
  address2,
  amount,
  routerContract,
  accountAddress,
  signer
) {
  const tokens = [address1, address2];
  const time = Math.floor(Date.now() / 1000) + 200000;
  const deadline = ethers.BigNumber.from(time);

  const token1 = new Contract(address1, ERC20.abi, signer);
  const tokenDecimals = await getDecimals(token1);
  
  const amountIn = ethers.utils.parseUnits(amount, tokenDecimals);
  const amountOut = await routerContract.callStatic.getAmountsOut(
    amountIn,
    tokens
  );

  await token1.approve(routerContract.address, amountIn);
  const wethAddress = await routerContract.WETH();

  if (address1 === wethAddress) {
    // Eth -> Token
    await routerContract.swapExactETHForTokens(
      amountOut[1],
      tokens,
      accountAddress,
      deadline,
      { value: amountIn }
    );
  } else if (address2 === wethAddress) {
    // Token -> Eth
    await routerContract.swapExactTokensForETH(
      amountIn,
      amountOut[1],
      tokens,
      accountAddress,
      deadline
    );
  } else {
    await routerContract.swapExactTokensForTokens(
      amountIn,
      amountOut[1],
      tokens,
      accountAddress,
      deadline
    );
  }
}

// 该函数返回两个代币地址之间的转换率
//    `amountIn` - 交换地址 1 的代币数量
//    `routerContract` - 执行此交换的路由合约
export async function getAmountOut(
  address1,
  address2,
  amountIn,
  routerContract,
  signer
) {
  try {
    const token1 = new Contract(address1, ERC20.abi, signer);
    const token1Decimals = await getDecimals(token1);

    const token2 = new Contract(address2, ERC20.abi, signer);
    const token2Decimals = await getDecimals(token2);

    const values_out = await routerContract.getAmountsOut(
      ethers.utils.parseUnits(String(amountIn), token1Decimals),
      [address1, address2]
    );
    const amount_out = values_out[1]*10**(-token2Decimals);
    console.log('amount out: ', amount_out)
    return Number(amount_out);
  } catch {
    return false;
  }
}

// 此函数调用配对合约以获取存储在地址 1 代币和地址 2 代币之间的流动性池中的储备金。 
// 需要一些额外的逻辑来确保以正确的顺序返回结果，因为“pair.getReserves()”总是以相同的顺序返回储备金，而不管地址的顺序是什么。
export async function fetchReserves(address1, address2, pair, signer) {
  try {

    // Get decimals for each coin
    const coin1 = new Contract(address1, ERC20.abi, signer);
    const coin2 = new Contract(address2, ERC20.abi, signer);

    const coin1Decimals = await getDecimals(coin1);
    const coin2Decimals = await getDecimals(coin2);

    // Get reserves
    const reservesRaw = await pair.getReserves();

    // Put the results in the right order
    const results =  [
      (await pair.token0()) === address1 ? reservesRaw[0] : reservesRaw[1],
      (await pair.token1()) === address2 ? reservesRaw[1] : reservesRaw[0],
    ];

    // Scale each to the right decimal place
    return [
      (results[0]*10**(-coin1Decimals)),
      (results[1]*10**(-coin2Decimals))
    ]
  } catch (err) {
    console.log("error!");
    console.log(err);
    return [0, 0];
  }
}

// 此函数返回存储在地址 1 代币和地址 2 代币之间的流动性池中的储备金，以及 accountAddress 拥有的该货币对的流动性代币。
//    `address1` - 要交易的代币的以太坊地址（代币或 AUT）
//    `address2` - 要交易的代币的以太坊地址（代币或 AUT）
//    `factory` - 
//    `signer` - 
export async function getReserves(
  address1,
  address2,
  factory,
  signer,
  accountAddress
) {
  try {
    const pairAddress = await factory.getPair(address1, address2);
    const pair = new Contract(pairAddress, PAIR.abi, signer);
  
    if (pairAddress !== '0x0000000000000000000000000000000000000000'){
  
      const reservesRaw = await fetchReserves(address1, address2, pair, signer);
      const liquidityTokens_BN = await pair.balanceOf(accountAddress);
      const liquidityTokens = Number(
        ethers.utils.formatEther(liquidityTokens_BN)
      );
    
      return [
        reservesRaw[0].toPrecision(6),
        reservesRaw[1].toPrecision(6),
        liquidityTokens,
      ];
    } else {
      console.log("no reserves yet");
      return [0,0,0];
    }
  }catch (err) {
    console.log("error!");
    console.log(err);
    return [0, 0, 0];
  }
}
