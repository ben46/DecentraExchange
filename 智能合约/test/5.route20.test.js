const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const utils_1 = ethers.utils;
const {MaxUint256} = ethers.constants;
// const MaxUint256 = ethers.constants.MaxUint256;

const ether = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const wei = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'wei')
}
const bigNumberify = wei
const overrides = {
  gasLimit: 9999999
}
let c_WETH10, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapPair, c_UniswapFactory, c_route02
let deployer, spender, user2, users
let l_UniswapV2Library, l_TransferHelper

async function myPrepare(){
    const WETH10 = await ethers.getContractFactory('WETH10')
    c_WETH10 = await WETH10.deploy()

    const WETH9 = await ethers.getContractFactory('ERC20Token')
    c_Token01 = await WETH9.deploy('Token0', 'TK0', ether(10000))
    await c_Token01.deployed()

    c_Token02 = await WETH9.deploy('Token1', 'TK1', ether(10000))
    await c_Token02.deployed()

    const UniswapFactory = await ethers.getContractFactory('UniswapFactory')
    c_UniswapFactory = await UniswapFactory.deploy()
    // console.log('pair byte code: ', await c_UniswapFactory.getPairBytecode())
    UniswapV2Pair = await ethers.getContractFactory('UniswapPair')

    const TransferHelper = await ethers.getContractFactory("TransferHelper");
     l_TransferHelper = await TransferHelper.deploy();
    await l_TransferHelper.deployed();

    const UniswapV2Library = await ethers.getContractFactory("UniswapV2Library");
     l_UniswapV2Library = await UniswapV2Library.deploy();
    await l_UniswapV2Library.deployed();

    const UniswapV2Router02 = await ethers.getContractFactory('UniswapV2Router02',
        {
            signer: deployer,
            libraries: {
                TransferHelper: l_TransferHelper.address,
                UniswapV2Library: l_UniswapV2Library.address
            }
        }
    )
    c_route02 = await UniswapV2Router02.deploy(c_UniswapFactory.address, c_WETH10.address);

}

describe('router02', () => {
    beforeEach(async () => {
      [deployer, spender, user2, ...users] = await ethers.getSigners();
      await loadFixture(myPrepare)
    })
    describe('router0201', async () => {

        it('quote', async () => {
            expect(await c_route02.quote(wei(1), wei(100), wei(200))).to.eq(wei(2))
            expect(await c_route02.quote(wei(2), wei(200), wei(100))).to.eq(wei(1))
            await expect(c_route02.quote(wei(0), wei(100), wei(200))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_AMOUNT'
            )
            await expect(c_route02.quote(wei(1), wei(0), wei(200))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
            await expect(c_route02.quote(wei(1), wei(100), wei(0))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
          })

          it('amoutout', async () => {
            expect(await c_route02.getAmountOut(bigNumberify(2), bigNumberify(100), bigNumberify(100))).to.eq(bigNumberify(1))
            console.log('amount out test')
            const amountOut = await c_route02.getAmountOut(bigNumberify(200), bigNumberify(10000), bigNumberify(10000))
            console.log(10000 * 10000)
            console.log((10000 + 200*0.997) * (10000-amountOut))

            await expect(c_route02.getAmountOut(bigNumberify(0), bigNumberify(100), bigNumberify(100))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT'
            )
            await expect(c_route02.getAmountOut(bigNumberify(2), bigNumberify(0), bigNumberify(100))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
            await expect(c_route02.getAmountOut(bigNumberify(2), bigNumberify(100), bigNumberify(0))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
          })

          it('getAmountIn', async () => {
            expect(await c_route02.getAmountIn(bigNumberify(1), bigNumberify(100), bigNumberify(100))).to.eq(bigNumberify(2))
            await expect(c_route02.getAmountIn(bigNumberify(0), bigNumberify(100), bigNumberify(100))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT'
            )
            await expect(c_route02.getAmountIn(bigNumberify(1), bigNumberify(0), bigNumberify(100))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
            await expect(c_route02.getAmountIn(bigNumberify(1), bigNumberify(100), bigNumberify(0))).to.be.revertedWith(
              'UniswapV2Library: INSUFFICIENT_LIQUIDITY'
            )
          }) 

        it('getAmountsOut', async function() { 

            // 先给路由合约授权
            await c_Token01.approve(c_route02.address, MaxUint256);
            await c_Token02.approve(c_route02.address, MaxUint256);

            // 添加流动性（会自己计算需要转入多少币）
            // 然后会自动转钱
            await c_route02.addLiquidity(
                        c_Token01.address, 
                        c_Token02.address, 
                        wei(10000), 
                        wei(10000), 
                        0,
                        0,
                        deployer.address,
                        MaxUint256); 

            await expect(c_route02.getAmountsOut(2, [c_Token01.address])).to.be.revertedWith(
                'UniswapV2Library: INVALID_PATH'
                ) 
            const path = [c_Token01.address, c_Token02.address]
            // 添加完流动性之后，计算币币汇率是多少？
            const res = await c_route02.getAmountsOut(2, path) 
            expect(res).to.deep.eq([wei(2), wei(1)])

        })

        it('getAmountsOut', async function() { 
            // 先给路由合约授权
            await c_Token01.approve(c_route02.address, MaxUint256);
            await c_Token02.approve(c_route02.address, MaxUint256);

            // 添加流动性（会自己计算需要转入多少币）
            // 然后会自动转钱
            await c_route02.addLiquidity(
                c_Token01.address, 
                c_Token02.address, 
                wei(10000), 
                wei(10000), 
                0,
                0,
                deployer.address,
                MaxUint256); 

            await expect(c_route02.getAmountsIn(1, [c_Token01.address])).to.be.revertedWith(
                'UniswapV2Library: INVALID_PATH'
                ) 

            const path = [c_Token01.address, c_Token02.address]
            // 添加完流动性之后，计算币币汇率是多少？
            const res = await c_route02.getAmountsIn(1, path) 
            expect(res).to.deep.eq([wei(2), wei(1)])
        })

        it('addliquidity ETH', async function() { 
            // 先给路由合约授权
            await c_Token01.approve(c_route02.address, MaxUint256);
            // await c_Token02.approve(c_route02.address, MaxUint256);

            // 添加流动性（会自己计算需要转入多少币）
            // 然后会自动转钱
            await c_route02.addLiquidityETH(
                c_Token01.address, 
                wei(10000), 
                0,
                0,
                deployer.address,
                MaxUint256, 
                {
                    value:wei(10000),
                    gasLimit: 9999999
                });

            // await expect(c_route02.getAmountsIn(1, [c_Token01.address])).to.be.revertedWith(
            //     'UniswapV2Library: INVALID_PATH'
            //     ) 
            const path = [c_Token01.address, c_WETH10.address]
            // // 添加完流动性之后，计算币币汇率是多少？
            const res = await c_route02.getAmountsIn(1, path) 
            expect(res).to.deep.eq([wei(2), wei(1)])
        })

        async function addLiquidity(DTTAmount, WETHAmount) {
            await c_Token01.approve(c_route02.address, MaxUint256)
            await c_route02.addLiquidityETH(c_Token01.address, DTTAmount, DTTAmount, WETHAmount, deployer.address, MaxUint256, {
                ...overrides,
                value: WETHAmount
            })
        }

        it('token01 -> weth', async function() { 
            await c_Token01.approve(c_route02.address, MaxUint256);
            const amountIn = ether(1)
            const ETHAmount = ether(10)
            const DTTAmount = ether(5).mul(100).div(99)
            await addLiquidity(DTTAmount, ETHAmount);
            await c_route02.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [c_Token01.address, c_WETH10.address],
                deployer.address,
                MaxUint256,
                overrides
            );
        })

        it('weth -> token01', async function() { 
            const amountIn = ether(1)
            const ETHAmount = ether(10)
            const DTTAmount = ether(5).mul(100).div(99)
            await addLiquidity(DTTAmount, ETHAmount);
            const before = await c_Token01.balanceOf(deployer.address)

            await c_WETH10.deposit({value:amountIn})
            await c_WETH10.approve(c_route02.address, amountIn);
            await c_route02.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [c_WETH10.address, c_Token01.address],
                deployer.address,
                MaxUint256,
                overrides
            );
            const after = await c_Token01.balanceOf(deployer.address)
            const amountOut = await c_route02.getAmountOut(amountIn, ETHAmount, DTTAmount)
            expect(amountOut).to.eq(after.sub(before))
        })

        it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
            const DTTAmount = ether(10)
                .mul(100)
                .div(99)
            const ETHAmount = ether(5)
            const swapAmount = ether(1)
            await addLiquidity(DTTAmount, ETHAmount)
            const before = await c_Token01.balanceOf(deployer.address)
            // 由于是直接转入eth，所以不需要approve
            await c_route02.swapExactETHForTokensSupportingFeeOnTransferTokens(
                0,
                [c_WETH10.address, c_Token01.address],
                deployer.address,
                MaxUint256,
                {
                  ...overrides,
                  value: swapAmount
                }
            )
            const after = await c_Token01.balanceOf(deployer.address)
            const amountOut = await c_route02.getAmountOut(swapAmount, ETHAmount, DTTAmount)
            expect(amountOut).to.eq(after.sub(before))
        })

        // 换回eth
        it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
            await c_Token01.approve(c_route02.address, MaxUint256);
            const amountIn = ether(1)
            const ETHAmount = ether(10)
            const DTTAmount = ether(5).mul(100).div(99)
            await addLiquidity(DTTAmount, ETHAmount);
            const before = await deployer.getBalance();
            console.log('before', before);
            await c_route02.swapExactTokensForETHSupportingFeeOnTransferTokens(
                amountIn,
                0,
                [c_Token01.address, c_WETH10.address],
                deployer.address,
                MaxUint256,
                overrides
            );
            // const after = await deployer.getBalance();
            // const amountOut = await c_route02.getAmountOut(amountIn, DTTAmount, ETHAmount);
            // expect(amountOut).to.eq(after.sub(before)) // 这里没法比较，因为用掉了比较多的gas
        })

    })
})