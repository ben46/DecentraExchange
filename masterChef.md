# master chef 测试用例
### 准备工作
1. owner, dev, treasury,alice,bob,carol用户
2. 每个测试用例之前,部署sushi token合约

### 用例:初始化状态
1. owner部署chef合约(给定每个区块出token数量, 起始区块)
2. 把sushi token owner权给chef

### 返回pool池子个数
1. 部署chef
2. 转移token所有权给chef
3. 部署lp1 token, lp2 token
4. lp1加入池子
5. lp2加入池子
6. 池子长度应该是2

### 池子
1. 部署chef
2. 转移权
3. 部署rewarder token
4. 部署rewarder & reward2(传入奖励的倍数,奖励币地址,chef地址)
3. 部署lp1 token, lp2 token
4. lp1和奖励合约加入池子
5. lp2和奖励合约加入池子
6. set函数(传入allocPoint=15,地址0,覆写false), 触发LogSetPool事件
7. pool0的allocPoint应该等于15
8. rewarder0应该等于rewarder
9. 重新set(传入池子0,allocPoint=18,reward2,覆写true)
7. pool0的allocPoint应该等于18
8. rewarder0应该等于rewarder2

## 返回未领取的token
1. 部署chef
2. 转移权
3. 部署lp1 token
4. lp1加入池子(allocPoint=10)
5. alice钱包调用lp1给chef授权
6. alice调用chef,存入往池子0中自己的地址里面存入1
7. 让block快进+9
8. updatePool0, 可以更新用户的奖励
9. 未领取的奖励应该等于xxx

## 允许紧急取款
1. 部署chef合约
2. 把token所有权转移给chef
3. 部署rewarder token
4. 部署rewarder
5. 部署lp
6. 把1000个lp转账给bob
7. bob把钱授权给chef
8. 把lp和rewarder加入chef的pool中
9. bob往池子里面存入100
10. bob的lp余额应该是900个
11. block快进+9
12. update pool 0(重新计算用户的奖励)
13. emergency withdraw(把token从rewarder转入to合约)

钱流向
```
deployer's lp --1000--> bob's lp --10--> chef's pool

deployer's reward token(10000)
rewarder's reward token -> to
```



