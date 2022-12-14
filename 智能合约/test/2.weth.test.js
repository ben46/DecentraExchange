const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const ether = tokens

describe('WETH9', () => {
  let c_WETH9, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapV2Factory
  let deployer, spender, user2, users
  let escrowAmount = ether(0.0001)

  beforeEach(async () => {
    [deployer, spender, user2, ...users] = await ethers.getSigners();
  })

  async function myPrepare(){
    const WETH9 = await ethers.getContractFactory('WETH10')
    c_WETH9 = await WETH9.deploy()
    await c_WETH9.deployed()
    console.log('weth address:'+ c_WETH9.address)
  }

  describe('case 01', () => {

    async function  deposit(){
      await loadFixture(myPrepare)
      const tx = await c_WETH9.deposit({value: escrowAmount});
      const receipt = await tx.wait()
      return receipt
    }

    it('deposit event', async () => {
      const receipt = await deposit();
      console.log(receipt.events[0].args)
      expect(receipt.events[0].args.from).to.equal(deployer.address);
      expect(receipt.events[0].args.value).to.equal(escrowAmount);
      expect(receipt.events[0].event).to.equal("Depoit");
    })

    it('deposit balance check', async () => {
      const receipt = await deposit();
      const balance = await c_WETH9.getBalance(deployer.address);
      expect(balance).to.equal(escrowAmount)
    })

    it('withdraw', async () => {
      await loadFixture(myPrepare)
      await c_WETH9.deposit({value: escrowAmount});

      const balance = await c_WETH9.getBalance(deployer.address);
      const my_new_val = ether(0.00001);
      const tx = await c_WETH9.withdraw(my_new_val);
      const receipt = await tx.wait()
      
      expect(receipt.events[0].args.to).to.equal(deployer.address);
      expect(receipt.events[0].args.amount).to.equal(my_new_val);
      expect(receipt.events[0].event).to.equal("Withdraw");

      const balanceAfter = await c_WETH9.getBalance(deployer.address);
      expect(balanceAfter.add(my_new_val)).to.equal(balance)

    })

    it('appove should revert', async () => {
      await loadFixture(myPrepare)
      const approve_amount = ether(0.00001);
      const balance = await c_WETH9.connect(deployer).getBalance(deployer.address);
      await expectRevert(
        c_WETH9.connect(deployer).approve(spender.address, approve_amount.add(balance)), 
        "ERC20:insufficient balance"
      );     
    })

    it('appove allowance', async () => {
      await loadFixture(myPrepare)
      const approve_amount = ether(0.00001);
      await c_WETH9.deposit({value:approve_amount})
      const balance = await c_WETH9.getBalance(deployer.address);

      const tx =await c_WETH9.approve(spender.address, approve_amount)
      const receipt = await tx.wait()
      
      expect(receipt.events[0].args.owner).to.equal(deployer.address);
      expect(receipt.events[0].args.spender).to.equal(spender.address);
      expect(receipt.events[0].args.value).to.equal(approve_amount);
      expect(receipt.events[0].event).to.equal("Approval");

      const approved_allowance = await c_WETH9.connect(spender).getAllowance(deployer.address);
      expect(approved_allowance).to.equal(approve_amount);
    })

    it('transfer from owner to user2', async () => {
      await loadFixture(myPrepare)
      const transfer_amount = ether(0.00001);
      
      await c_WETH9.connect(deployer).deposit({value:transfer_amount});
      console.log('deposit success');

      const balance0_before = await c_WETH9.getBalance(deployer.address);
      console.log(balance0_before)

      const balacne1_before = await c_WETH9.getBalance(user2.address);
      console.log(balacne1_before)

      // const allowance_before = await c_WETH9.getAllowance(deployer.address);
      // console.log(allowance_before)

      const tx = await c_WETH9.connect(deployer).transferFrom(deployer.address, user2.address, transfer_amount);

      // ??????event???????????????
      const receipt = await tx.wait()
      expect(receipt.events[0].args.from).to.equal(deployer.address);
      expect(receipt.events[0].args.to).to.equal(user2.address);
      expect(receipt.events[0].args.value).to.equal(transfer_amount);
      expect(receipt.events[0].event).to.equal("Transfer");

      const balance0_after = await c_WETH9.getBalance(deployer.address);
      const balance1_after = await c_WETH9.getBalance(user2.address);

      // ??????balance???????????????
      expect(balance0_before).to.equal(balance0_after.add(transfer_amount))
      expect(balacne1_before).to.equal(balance1_after.sub(transfer_amount))

      // expect(balacne1_before).to.equal(balance1_after.sub(transfer_amount))

    })

    it('spender transfer from deployer to user2', async () => {
      await loadFixture(myPrepare)
      const transfer_amount = ether(0.00001);
      
      // ??????
      console.log('??????');
      await c_WETH9.connect(deployer).deposit({value:transfer_amount});
      console.log('?????? success');

      console.log('??????balance')
      // ???????????????balance
      const balance0_before = await c_WETH9.getBalance(deployer.address);
      console.log(balance0_before)

      const balacne1_before = await c_WETH9.getBalance(user2.address);
      console.log(balacne1_before)
      console.log('??????balance??????')

      // ????????????
      console.log('????????????')
      const approve_tx =await c_WETH9.connect(deployer).approve(spender.address, transfer_amount)
      const approve_receipt = await approve_tx.wait()
      expect(approve_receipt.events[0].args.owner).to.equal(deployer.address);
      expect(approve_receipt.events[0].args.spender).to.equal(spender.address);
      expect(approve_receipt.events[0].args.value).to.equal(transfer_amount);
      expect(approve_receipt.events[0].event).to.equal("Approval");
      console.log('????????????')

      console.log('get????????????')
      const allowance_before = await c_WETH9.connect(spender).getAllowance(deployer.address);
      console.log(allowance_before)
      expect(allowance_before).to.equal(transfer_amount)
      console.log('get????????????')

      // ??????
      console.log('??????')
      const tx = await c_WETH9.connect(spender).transferFrom(deployer.address, user2.address, transfer_amount);

      // ??????event???????????????
      const receipt = await tx.wait()
      expect(receipt.events[0].args.from).to.equal(deployer.address);
      expect(receipt.events[0].args.to).to.equal(user2.address);
      expect(receipt.events[0].args.value).to.equal(transfer_amount);
      expect(receipt.events[0].event).to.equal("Transfer");
      console.log('??????suc')

      const balance0_after = await c_WETH9.getBalance(deployer.address);
      const balance1_after = await c_WETH9.getBalance(user2.address);

      // ??????balance???????????????
      expect(balance0_before).to.equal(balance0_after.add(transfer_amount))
      expect(balacne1_before).to.equal(balance1_after.sub(transfer_amount))

      // expect(balacne1_before).to.equal(balance1_after.sub(transfer_amount))

    })
  })

})
