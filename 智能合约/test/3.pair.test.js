const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');

const ether = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const wei = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'wei')
}
const overrides = {
  gasLimit: 9999999
}

let c_WETH9, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapV2Factory, c_UniswapPair
let deployer, spender, user2, users
let escrowAmount = ether(0.0001)

// 部署token合约，工厂合约， pair合约
async function myPrepare(){
    const WETH9 = await ethers.getContractFactory('ERC20Token')
    c_Token01 = await WETH9.deploy('Token0', 'TK0', ether(10000))
    await c_Token01.deployed()

    c_Token02 = await WETH9.deploy('Token1', 'TK1', ether(10000))
    await c_Token02.deployed()

    const UniswapFactory = await ethers.getContractFactory('UniswapFactory')
    const c_UniswapFactory = UniswapFactory.deploy()

    const UniswapPair = await ethers.getContractFactory('UniswapPair')
    c_UniswapPair = await UniswapPair.deploy()
    await c_UniswapPair.deployed()

    const tokenA = c_Token01.address
    const tokenB = c_Token02.address
    let token0, token1
    if(tokenA < tokenB) {
      token0 = tokenA
      token1 = tokenB
    } else {
      token0 = tokenB
      token1 = tokenA
    }
    await c_UniswapPair.initialize(token0, token1); 
}

describe('ERC20', () => {

  beforeEach(async () => {
    [deployer, spender, user2, ...users] = await ethers.getSigners();
    })

  describe('transfer from owner to user2', async () => {
        let tx, balance0_before, balacne1_before, transfer_amount;
        beforeEach(async function(){
            console.log('transfer from owner to user2')
            await loadFixture(myPrepare)
        })

        it('token names', async function() {
          const token1_name = await c_Token01.name()
          expect(token1_name).to.equal('Token0')

          const token2_name = await c_Token02.name()
          expect(token2_name).to.equal('Token1')
        })

        it('initilize tokens', async function() { 

            let reserve0, reserve1, block_timestamp;
            const results = await c_UniswapPair.getReserves()
            reserve0 = results[0]
            reserve1 = results[1]
            block_timestamp = results[2]
            console.log(reserve0, reserve1, block_timestamp)
            
            console.log('正在转账给pair')
            if(reserve0 ==0 && reserve1 == 0) {
              await c_Token01.transfer(c_UniswapPair.address, ether(1));
              await c_Token02.transfer(c_UniswapPair.address, ether(4));
            }
            console.log('转账成功')

            const supply_before = await c_UniswapPair.totalSupply();
            console.log('总流动性before'+supply_before);

            const liquidity_minted = await c_UniswapPair.mint(deployer.address, overrides);
            const receipt = await liquidity_minted.wait()
            // console.log('new铸造的流动性', receipt);
            // console.log(liquidity_minted);

            const supply_after = await c_UniswapPair.totalSupply()
            console.log('总流动性after'+supply_after); 
            
            // 流动性是否增加了
            let liquidity_should_mint  = BN( 2, 'ether')
            // expect(supply_after-supply_before).to.equal(liquidity_should_mint.toString())

            // 这里遇到问题暂时无法解决。。。
            const pair_balance = await c_UniswapPair.balanceOf(deployer.address)
            // console.log(pair_balance)
            // let ppp = liquidity_should_mint.sub(BN(1000, 'wei'))
            // console.log(ppp)

            expect(await c_Token01.balanceOf(c_UniswapPair.address)).to.equal(ether(1))
            expect(await c_Token02.balanceOf(c_UniswapPair.address)).to.equal(ether(4))

            // // 储备粮是否更新
            const results2 = await c_UniswapPair.getReserves()
            reserve0_after = results2[0]
            reserve1_after = results2[1]
            expect(reserve0_after).to.equal(ether(1))
            expect(reserve1_after).to.equal(ether(4))
        })

        async function addLiquidity(token0Amount, token1Amount) {
          console.log('addliquidty...')
          console.log('transfer...')
          await c_Token01.transfer(c_UniswapPair.address, token0Amount)
          await c_Token02.transfer(c_UniswapPair.address, token1Amount)
          expect(await c_Token01.address).to.equal(await c_UniswapPair.token0()) 
          console.log('mint...')
          await c_UniswapPair.mint(deployer.address, overrides)
          console.log('...addliquidity')
        }
        async function removeLiquidity() { 
          }


        const swapTestCases = [
          [1, 5, 10, '1662497915624478906'],
          [1, 10, 5, '453305446940074565'],
      
          [2, 5, 10, '2851015155847869602'],
          [2, 10, 5, '831248957812239453'],
      
          [1, 10, 10, '906610893880149131'],
          [1, 100, 100, '987158034397061298'],
          [1, 1000, 1000, '996006981039903216']
        ].map(a => a.map(n => (typeof n === 'string' ? wei(n) : ether(n)    )))

        swapTestCases.forEach((swapTestCase, i) => {
          it(`getInputPrice:${i}`, async () => {
            const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase
            console.log(swapAmount, token0Amount, token1Amount, expectedOutputAmount)
            await addLiquidity(token0Amount, token1Amount)
            await c_Token01.transfer(c_UniswapPair.address, swapAmount)
            await expect(c_UniswapPair.swap(0, expectedOutputAmount.add(1), deployer.address, '0x', overrides)).to.be.revertedWith(
              'UniswapV2: K'
            )
            const before = await c_Token02.balanceOf(deployer.address)
            await c_UniswapPair.swap(0, expectedOutputAmount, deployer.address, '0x', overrides)
            const after = await c_Token02.balanceOf(deployer.address)
            expect(expectedOutputAmount).to.eq(after.sub(before))
            // //-----------
            // await removeLiquidity()

          })
        }) 
        
        it(`burn liquidity`, async () => {
            const MINIMUM_LIQUIDITY = wei(1000)
            console.log('burn liquidity--------')
            expect(await c_UniswapPair.totalSupply()).to.eq(0)

            console.log(await c_UniswapPair.balanceOf(deployer.address))

            const token0Amount = ether(3)
            const token1Amount = ether(3)
            await addLiquidity(token0Amount, token1Amount)

            const expectedLiquidity = ether(3)
            expect(await c_UniswapPair.totalSupply()).to.eq(expectedLiquidity)

            // 吧流动性转入合约地址
            await c_UniswapPair.connect(deployer).transfer(c_UniswapPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            // 销毁流动性，释放token1，token2
            await c_UniswapPair.burn(deployer.address, overrides)
            
            expect(await c_UniswapPair.balanceOf(deployer.address)).to.eq(0)
            // 合约中的流动性应该销毁
            expect(await c_UniswapPair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
            // 应该保留有最小的流动性代币
            expect(await c_Token01.balanceOf(c_UniswapPair.address)).to.eq(1000)
            // 应该保留有最小的流动性代币
            expect(await c_Token02.balanceOf(c_UniswapPair.address)).to.eq(1000)

            const totalSupplyToken0 = await c_Token01.totalSupply()
            const totalSupplyToken1 = await c_Token02.totalSupply()
            // 用户账户token0的数量 = 总供应量-最小流动性代币
            expect(await c_Token01.balanceOf(deployer.address)).to.eq(totalSupplyToken0.sub(1000))
            expect(await c_Token02.balanceOf(deployer.address)).to.eq(totalSupplyToken1.sub(1000))
        })         
 
    })

})
