pragma solidity ^0.8.6;
import "./ERC20.sol";
import "./SafeMath.sol";
import "./IUniswapERC20.sol";
import "./IUniswapV2Pair.sol";
import "./IUniswapV2Factory.sol";


contract UniswapERC20 is IUniswapERC20{
    string public constant name = "Uniswap";
    string public constant symbol = "UNI";
    uint8 public constant decimals = 18;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address=>uint)) public allowance;
    uint public totalSupply;
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping (address => uint) public _nounces;
    using SafeMath for uint;
    using SafeMath for uint256;

    constructor(){
        // uint chainId = block.chainid;
        // uint chainId;
        // assembly {
        //     chainId := block.chainid
        // }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                block.chainid,
                address(this)
            )
        );
    }

    function _mint(address account, uint value) internal{

        totalSupply += value;
        unchecked { // 如果totoalsupply都没有溢出，那么下面这个更不会溢出，所以不用检查
            balanceOf[account] += value;
        }
        emit Transfer(address(0), account, value);
    }

    function _burn(address account, uint value) internal{
        require(account != address(0), "ERC20: invalid mint addr");
        require(balanceOf[account] >= value, 'ERC20:insufficient balance');
        unchecked {
            balanceOf[account] = balanceOf[account].sub(value);
            totalSupply = totalSupply.sub(value);
        }
        emit Transfer(account, address(0), value);
    }

    // internal function
    function _approve(address spender, address owner, uint amount) internal{
        require(spender != address(0), 'ERC20: invalid spender address');
        require(owner != address(0), 'ERC20: invalid owner address');
        allowance[owner][spender] = amount;
    }
 
    function approve(address spender, uint amount) public  override  returns (bool){
        require(balanceOf[msg.sender] >= amount, "ERC20:insufficient balance");
        _approve(spender, msg.sender, amount);
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // internal function
    function _spendAllowance(address spender, address owner, uint amount)internal{
        if(allowance[owner][spender] != type(uint).max){
            unchecked {
                _approve(spender, owner, allowance[owner][spender]- amount);
            }
        }
    }

    function _transferFrom(address from, address to, uint amount) private returns(bool){
        if(from != msg.sender) {
            require(allowance[from][msg.sender] >= amount, 'ERC20:insufficient allowance');
            _spendAllowance(msg.sender, from, amount);
        }
        balanceOf[from] = balanceOf[from].sub(amount);
        balanceOf[to] = balanceOf[to].add(amount);
        emit Transfer(from, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint amount) public override returns(bool){
        return _transferFrom(from, to, amount);
    }

    function transfer(address to, uint value) public override returns (bool){    
        return _transferFrom(msg.sender, to, value);
    }

    function nounces(address owner) public override view returns (uint){
        return _nounces[owner];
    }

    /**
    * 授权
    */
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) public override{
        require(block.timestamp >= deadline, 'UniswapV2Pair:time expired');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, _nounces[owner]++, deadline))
            )
        );
        address recoveraddress = ecrecover(digest, v, r, s);
        require(recoveraddress!=address(0) && recoveraddress == owner, 'owner address verify failed');
        _approve(spender, owner, value);

    } 
}
interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
contract UniswapPair is IUniswapV2Pair, UniswapERC20{
     
    // mapping (address => mapping(address => uint)) public liquidity;
    uint112 public reserve0;
    uint112 public reserve1;

    address public token0;
    address public token1;
    address public factory;

    uint public kLast;
    uint private _initialized;
    uint32 public blockTimestampLast;
    using SafeMath for uint;
    using SafeMath for uint256;
    uint public constant MINIMUM_LIQUIDITY = 10 ** 3;

    using UQ112x112 for uint224;
    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint private _lock;

    modifier lock{
        require(_lock == 0, 'UniswapPair:locked');
        _lock = 1;
        _;
        _lock = 0;
    }

    constructor(){
        factory = msg.sender;
    } 

    // function liquidity(address token0, address token1)
 
    function initialize(address __token0, address __token1) public override {
        require(_initialized == 0, 'already intilized');
        token0 = __token0;
        token1 = __token1;
        _initialized = 1;
    }

    // 谁都可以调用，但是会检查是否有新的币转入，如果没有，你调用也是没用滴～
    function mint(address to) public override lock returns (uint _liquidity){
        // require(msg.sender == factory, 'UniswapPair:factory only');
        // 原来有多少个
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();

        // 查看现在账上有多少个
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        // 转入了多少个
        // 这里应该用safemath
        uint amount0In = balance0 - _reserve0;
        uint amount1In = balance1 - _reserve1;

        // 计算流动性应该增加多少
        uint _totalSupply = totalSupply;
        if(_totalSupply == 0) {
            _liquidity = Math.sqrt(amount0In.mul(amount1In)).sub(MINIMUM_LIQUIDITY);
            _mint(address(0), MINIMUM_LIQUIDITY); // 锁死初始最小流动性,提高黑客攻击成本
        } else {
            // total supply / reserve0
            // amount in * total supply / reserve0
            _liquidity = Math.min(amount0In.mul(_totalSupply)/_reserve0, amount1In.mul(_totalSupply)/_reserve1);
        }

        // mint出来
        require(_liquidity > 0, "UniswapPair:insufficient liquidity minted");
        _mint(to, _liquidity);

        // 更新数量
        _update(balance0, balance1, _reserve0, _reserve1);
    }

    function burn(address to) public override returns (uint amount0, uint amount1){

        // 原来有多少个
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // 省邮费

        address _token0 = token0;                                // 省邮费
        address _token1 = token1;                                // 省邮费
        
        // // 查看现在账上有多少个
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));

        // 先把用户钱包里面的lp token转入pair合约， 然后销毁
        uint liquidity = balanceOf[address(this)];// 

        uint _totalSupply = totalSupply;
        amount0 = liquidity.mul(balance0) / _totalSupply; // liquidity / totalsupply * balance of total token1()
        amount1 = liquidity.mul(balance1) / _totalSupply; // liquidity / totalsupply * balance of total token1()
        require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');

        // 先把用户钱包里面的lp token转入pair合约， 然后销毁
        _burn(address(this), liquidity); 

        //  打钱！
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        _update(balance0, balance1, _reserve0, _reserve1);

    }

    function _update(uint balance0,uint balance1, uint112 _reserve0, uint112 _reserve1) private{
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if(timeElapsed>0 && _reserve0 != 0 && _reserve1 != 0){
            // 价格预言机，在oracle里面可以北前端调用，预测大致的价格
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    function _safeTransfer(address token, address to, uint value)private{
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "transfer failed");
    }

    //不能重入,重入可能导致余额计算错误导致多转账等一些bug
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) public override lock{
        require((amount0Out == 0 || amount1Out == 0) && (amount0Out > 0 || amount1Out > 0), "Pair:amount in should greater than zero");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "Pair:insufficient liquidity");
        uint balance0;
        uint balance1;
        {
            // 大气，先把钱转给用户. 问题： 万一后面不成功，咋弄呢？
            if(amount0Out > 0) _safeTransfer(token0, to, amount0Out);
            if(amount1Out > 0) _safeTransfer(token1, to, amount1Out);
            // address sender, uint amount0, uint amount1, bytes calldata data) 
            // 如果用户的智能合约写了uniswap的callback，那么就会调用，这时候用户可以把套利操作完成
            // 传入msgsender， 告诉智能合约你原来的调用者是谁
            // 传入他们回掉的calldata， 让他们验证消息正确与否
            // 这里的msgsender可能是路由合约，也可能是用户写的套利程序，或者用户自己用钱包直接调用
            if(data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            balance0 = IERC20(token0).balanceOf(address(this));
            balance1 = IERC20(token1).balanceOf(address(this));
        }
        uint amount0In;
        uint amount1In;
        if(amount0Out == 0) {
            amount0In = balance0 - _reserve0; // 现在 减去 原来的 加上 转出去的 
        }
        if(amount1Out == 0) {
            amount1In = balance1 - _reserve1;
        }
        require(amount0In > 0 || amount1In > 0, 'uniswap:insufficient input amount');
        {
            //uint balance0Adjusted = balance0 * 1000 - amount0In * 3; // 扣除千分之三手续费
            uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));

            // uint balance1Adjusted = balance1 * 1000 - amount1In * 3;
            uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));

            require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2)  , 'UniswapV2: K'); // 新k不能小于老的k
        }
        _update(balance0, balance1, _reserve0, _reserve1);

        // 这里的msgsender可能是路由合约，也可能是用户写的套利程序，或者用户自己用钱包直接调用
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);        
    }

    function getReserves() public override view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast){
        return (reserve0, reserve1, blockTimestampLast);
    }

    function skim(address to) public override{

    }

    function sync() public override{

    }
}

contract UniswapFactory is IUniswapV2Factory{
// 为什么index最多是三个？
    address[] public allPairs;
    mapping (address => mapping(address => address)) public getPair;

    constructor(){}

    function allPairsLength() public view returns (uint){
        return allPairs.length;
    }

    // function getPair(address tokenA, address tokenB) external view returns (address pair){
    //     return getPair
    // }

    function createPair(address tokenA, address tokenB)external returns(address pair){
        require(tokenA != tokenB,"token should not be same");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'address should not be zero');
        require(getPair[token0][token1]==address(0), 'address already exits');
        bytes memory bytecode = type(UniswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly{
            pair:=create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IUniswapV2Pair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    } 
    function feeTo() public override view returns (address){}
    function feeToSetter() public override view returns (address){}

    function setFeeTo(address) public override{}
    function setFeeToSetter(address) public override{}
}
