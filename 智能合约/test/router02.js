const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('WETH9', () => {
  let c_WETH9, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapV2Factory
  let deployer, feesetter, user2, users
  let escrowAmount = ether(0.001)

  beforeEach(async () => {
    [deployer, feesetter, user2, ...users] = await ethers.getSigners();

    const WETH9 = await ethers.getContractFactory('WETH9')
    c_WETH9 = await WETH9.deploy()
    await c_WETH9.deployed()

    const Token01 = await ethers.getContractFactory('Token01')
    c_Token01 = await Token01.deploy()
    await c_Token01.deployed()

    const Token02 = await ethers.getContractFactory('Token02')
    c_Token02 = await Token02.deploy()
    await c_Token02.deployed()

    const UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory')
    c_UniswapV2Factory = await UniswapV2Factory.deploy(feesetter.address)
    await c_UniswapV2Factory.deployed()

    const UniswapV2Router02 = await ethers.getContractFactory('UniswapV2Router02')
    c_UniswapV2Router02 = await UniswapV2Router02.deploy(c_UniswapV2Factory.address, c_WETH9.address)
    await c_UniswapV2Router02.deployed()

  })

  describe('case 1', () => {
    it('case 101', async () => {

      const pari_created = await c_UniswapV2Factory.createPair(c_WETH9.address, c_Token01.address);
      await pari_created.wait()

      const pair_addr = await c_UniswapV2Factory.getPair(c_WETH9.address, c_Token01.address);

      // console.log(pari_created)
      // console.log(pair_addr)

      const abi = [
        "function balanceOf(address owner) external view returns (uint)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function factory() external view returns (address)"
      ]
      const provider = new ethers.providers.Web3Provider(network.provider)
      const c_pair = new ethers.Contract(pair_addr, abi, provider)

      expect(await c_pair.token0()).to.equal(c_WETH9.address)
      expect(await c_pair.token1()).to.equal(c_Token01.address)
      expect(c_UniswapV2Factory.address).to.equal(await c_pair.factory())

    })

    it('case 102', async () => {

      const amountADesired = 10;
      const amountBDesired = 20;
      const amountAMin = 2;
      const amountBMin = 1;

      const deadlineFromNow = Math.ceil(Date.now() / 1000) + 20*60;
      console.log(deadlineFromNow);

// wrappedCurrency(currencyA, chainId)?.address ?? '',
//         wrappedCurrency(currencyB, chainId)?.address ?? '',
//         parsedAmountA.raw.toString(),
//         parsedAmountB.raw.toString(),
//         amountsMin[Field.CURRENCY_A].toString(),
//         amountsMin[Field.CURRENCY_B].toString(),
//         account,

      [amountA, amountB, liquidity] = await c_UniswapV2Router02.addLiquidity(
        c_WETH9.address, 
        c_Token01.address, 
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        deployer.address,
        deadlineFromNow
        )
      // console.log(amountA)
      // console.log(amountB)
      // console.log(liquidity)

      // transaction = await contract.connect(deployer).deposit({value: escrowAmount})
      // await transaction.wait()

      // const balance = await contract.getBalance()
      // expect(balance).to.equal(escrowAmount)

    })
  })

})
