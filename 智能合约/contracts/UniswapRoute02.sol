pragma solidity ^0.8.6;
import "./SafeMath.sol";
import "./IUniswapV2Pair.sol";
import "./IUniswapV2Factory.sol";
import "./IERC20.sol";
import "./WETH10.sol";

interface IUniswapV2Router01 {
    function factory() external view returns (address);
    function WETH() external view returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountETH);
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

interface IWETH10{
    function transferFrom(address from, address to, uint amount) external  returns(bool);
    function transfer(address to, uint value) external  returns (bool);
    function deposit() external payable;
    function withdraw(uint _amount) external;

}

contract UniswapV2Router02 is IUniswapV2Router02 {

    using SafeMath for uint;
    address public immutable _factory;
    address public immutable _WETH;

    constructor(address f, address w){
        _factory = f;
        _WETH = w;
    }

    function factory()public override view returns(address){
        return _factory;
    }
    
    function WETH() public override view returns(address){
        return _WETH;
    }

    modifier ensure(uint deadline){
        require(deadline > block.timestamp, 'UniswapV2Router02:time expired');
        _;
    }

    // 如果用户想要换eth，那么最后eth会先转入本路由地址，然后在转给用户
    // 调用函数的时候转入的eth，不会到这里来
    receive() external payable {
        // 转入方应该是weth合约，否则拒绝转入
        assert(msg.sender == _WETH);
    }

    function _addLiquidity(    
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin) private returns(uint amountA, uint amountB){
        // 判断pair合约是否存在
        address pair_addr = IUniswapV2Factory(_factory).getPair(tokenA, tokenB);
        if (pair_addr == address(0)) {
            IUniswapV2Factory(_factory).createPair(tokenA, tokenB);
        }
        
        // 如果不存在就新建一个
        // 如果存在就增加流动性
        // 计算能增加流动性，需要多少钱
        (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(_factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint quoteB = UniswapV2Library.quote(amountADesired, reserveA, reserveB);
            if (quoteB <= amountBDesired){
                require(quoteB >= amountBMin, 'fail');
                amountB = quoteB;
                amountA = amountADesired;
            } else {
                amountA = UniswapV2Library.quote(amountBDesired, reserveA, reserveB);
                assert(amountA <= amountADesired); // avoid imposible situations
                require(amountA >= amountAMin, 'fail');
                amountB = amountBDesired;
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
        ) public ensure(deadline) returns(uint amountA, uint amountB, uint liquidity){
        // 增加流动性
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        // 获取pair合约地址
        address pair = UniswapV2Library.pairFor(_factory, tokenA, tokenB);
        // 把用户的token转入pair合约
        TransferHelper.safeTransferFrom(msg.sender, tokenA, pair, amountA);
        TransferHelper.safeTransferFrom(msg.sender, tokenB, pair, amountB);
        // // mint 流动性
        liquidity = IUniswapV2Pair(pair).mint(to);// to是啥呀？to是用户的地址
    }

    // --------------------
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public override returns (uint amountETH){}
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) public override returns (uint amountETH){}

    function _swapExactTokens(address[] calldata path, address _to) internal{
        // 交换
        for(uint i;i<path.length-1;i++){
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = UniswapV2Library.sortTokens(input, output);
            IUniswapV2Pair pair = IUniswapV2Pair(UniswapV2Library.pairFor(_factory, path[i], path[i+1]));
            uint amountInput;
            uint amountOutput;
            {// Stack too deep error
                // 获取储备
                (uint reserve0, uint reserve1,) = pair.getReserves();
                // 排序后才能获得正确顺序的reserve，否则下一步计算会出错
                (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            
                // 查看转入了多少钱
                amountInput = IERC20(input).balanceOf(address(pair)) - reserveInput;
                //计算能转出多少钱
                amountOutput = getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            // 如果存在下一个path，那就转入下一个pair合约，否则直接转入用户账户，结束
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(_factory, output, path[i + 2]) : _to;
            // 这里要排序，要和合约中的token0对应数量，否则转账会失败
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    // 告诉函数你打算用多少币换xxx，函数自动把你的钱转走进行交易
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) public  override ensure(deadline){

        // 第一步，转钱到第一个pair合约上
        TransferHelper.safeTransferFrom(
            msg.sender, 
            path[0], 
            UniswapV2Library.pairFor(_factory, path[0], path[1]), 
            amountIn);
        uint balanceBefore = IUniswapERC20(path[path.length - 1]).balanceOf(_to);
        _swapExactTokens(path, _to);  
        uint balanceAfter = IUniswapERC20(path[path.length - 1]).balanceOf(_to);
        require(balanceAfter.sub(balanceBefore) >= amountOutMin, 'Route02:insufficient amount out');
    }

    // 直接转入eth，换取token
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) public override payable ensure(deadline){
        require(path[0] == _WETH, 'invalid path');
        require(path.length >=2, 'path too short');
        uint amountIn = msg.value;
        // 1. 打钱
        IWETH10(_WETH).deposit{value:msg.value}();
        assert(IWETH10(_WETH).transfer( UniswapV2Library.pairFor(_factory, _WETH, path[1]), amountIn));
        uint balanceBefore = IUniswapERC20(path[path.length - 1]).balanceOf(_to);
        _swapExactTokens(path, _to);
        uint balanceAfter = IUniswapERC20(path[path.length - 1]).balanceOf(_to);
        require(balanceAfter.sub(balanceBefore) >= amountOutMin, 'Route02:insufficient amount out');
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) public override ensure(deadline){
        require(path[path.length-1] == _WETH, 'invalid path');
        TransferHelper.safeTransferFrom(
            msg.sender, 
            path[0], 
            UniswapV2Library.pairFor(_factory, path[0], path[1]), 
            amountIn);
        _swapExactTokens(path, address(this));   
        uint balance = IERC20(_WETH).balanceOf(address(this));
        require(balance > amountOutMin, 'insufficient output');
        IWETH10(_WETH).withdraw(balance);
        TransferHelper.safeTransferETH(_to, balance);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public override payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity){
        // 增加流动性
        (amountToken, amountETH) = _addLiquidity(token, _WETH, amountTokenDesired, msg.value, amountTokenMin, amountETHMin);
        // require(amountETH <= msg.value, 'router02:insufficient eth in');
        // 获取pair合约地址
        address pair = UniswapV2Library.pairFor(_factory, token, _WETH);
        // 把用户的token转入pair合约
        TransferHelper.safeTransferFrom(msg.sender, token, pair, amountToken);
        // 把路由合约上的eth，转给weth
        IWETH10(_WETH).deposit{value:amountETH}();
        // 把weth的钱转给pair合约
        assert(IWETH10(_WETH).transfer(pair, amountETH)); // 不应该出错的地方，用assert
        // mint 流动性
        IUniswapV2Pair(pair).mint(to);// to是啥呀？to是用户的地址
        if(amountETH < msg.value){ // 多的也不要浪费了，还给人家
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public override returns (uint amountA, uint amountB){}
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public override returns (uint amountToken, uint amountETH){}
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) public override returns (uint amountA, uint amountB){}
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) public override returns (uint amountToken, uint amountETH){}
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) public override returns (uint[] memory amounts){}
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) public override returns (uint[] memory amounts){}
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        public override
        payable
        returns (uint[] memory amounts){}
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        public override
        returns (uint[] memory amounts){}
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        public override
        returns (uint[] memory amounts){}
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        public override
        payable
        returns (uint[] memory amounts){}

    // 流动性询价，添加后，保持k值不变
    function quote(uint amountA, uint reserveA, uint reserveB) public override pure returns (uint amountB){
        return UniswapV2Library.quote(amountA, reserveA, reserveB);
    }

    // swap的时候用
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public override pure returns (uint amountOut){
        return UniswapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    // swap的时候用
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public override pure returns (uint amountIn){
        return UniswapV2Library.getAmountIn(amountOut, reserveOut, reserveIn);
    }

    // swap的时候用
    function getAmountsOut(uint amountIn, address[] calldata path) public override view returns (uint[] memory amounts){
        return UniswapV2Library.getAmountsOut(_factory, amountIn, path);
    }

    // swap的时候用
    function getAmountsIn(uint amountOut, address[] calldata path) public override view returns (uint[] memory amounts){
        return UniswapV2Library.getAmountsIn(_factory, amountOut, path);
    }
}

library UniswapV2Library{
    using SafeMath for uint;

    // test covered
    function sortTokens(address token0, address token1) public pure returns(address tokenA, address tokenB){
        require(token1 != token0, 'token should not be same');
        (tokenA, tokenB) = token0 < token1 ? (token0, token1) : (token1, token0);
        require(tokenA != address(0), 'invalid token address');
    }

    function _convert(bytes32 data)private pure returns(address){
        return address(uint160(uint256(data)));
    }

    // test covered
    function pairFor(address factory, address token0, address token1)public pure returns(address pair){
        // 这里的pair生成hash需要修改, 否则无法获取正确的pair地址
        (address tokenA, address tokenB) = sortTokens(token0, token1);
        bytes32 m = keccak256(abi.encodePacked(
            hex'ff',
            factory,
            keccak256(abi.encodePacked(tokenA, tokenB)), // salt
            hex'958fd6f0a8d8b8e424e8328de68f015a344ea5ddf90f658f81b626c6d886ec1c' // pair合约的bytecode的keccak256(编译之后，从json文件里面找到bytecode， 然后进行keccak256)
        ));
        pair = _convert(m);
    }

    // 添加后，保持k值不变
    function quote(uint amountA, uint reserveA, uint reserveB) pure public returns(uint amountB){
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // 进来的时候可能是乱序的，返回的时候也应该乱序
    function  getReserves(address factory, address token0, address token1)public view returns(uint, uint){
        (address tokenA,) = sortTokens(token0, token1); 
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pairFor(factory, token0, token1)).getReserves();
        return tokenA == token0 ? (uint(reserve0), uint(reserve1)) : (uint(reserve1), uint(reserve0));
    } 

    function getAmountIn(uint amountOut, uint reserveOut, uint reserveIn) pure public returns(uint amountIn){
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    // swap的时候用, 一，进来的钱要扣税，二，出去的钱要保持储备量相成与原来一致
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public  pure returns (uint amountOut){
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        // reserveIn * reserveOut == (reserveIn + amountIn * 0.997) * (reserveOut - amountOut)
        // 将上述公示化简后，得到以下代码
        // 税后的输入数额 = 0.997 * 输入
        uint amountInWithFee = amountIn.mul(997);
        // 分子， 税后的输入 * 储备out
        uint numerator = amountInWithFee.mul(reserveOut);
        // 分母， 储备in + 税后输入数额 * 0.001
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
        // amountOut = amountIn * 997 * reserveOut / (reserveIn * 1000 + amountIn * 997);
    }

    // swap的时候用
    function getAmountsOut(address _factory, uint amountIn, address[] calldata path) public  view returns (uint[] memory amounts){
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for(uint i; i < path.length - 1;i++){
            (uint reserveIn, uint reserveOut) = getReserves(_factory, path[i], path[i+1]);
            amounts[i+1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        } 
    }

    // swap的时候用
    function getAmountsIn(address _factory, uint amountOut, address[] calldata path) public  view returns (uint[] memory amounts){
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[path.length - 1] = amountOut;
        for(uint i = path.length - 1; i > 0;i--){
            (uint reserveIn, uint reserveOut) = getReserves(_factory, path[i-1], path[i]);
            amounts[i-1] = getAmountIn(amounts[i], reserveOut, reserveIn);
        } 
    }
}


library TransferHelper {

    function safeTransfer(address token, address to, uint value) public returns(bool success){
                // bytes4(keccak256(bytes('transfer(address,uint256)')));

        (bool _success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');
        success = _success;
    }

    function safeTransferFrom(address from, address token, address to, uint value) public returns(bool success){
        // bytes4 selector =  bytes4(keccak256(bytes('transferFrom(address,address,uint)')));
        // (bool success, bytes memory data) = token.call(abi.encodeWithSelector(selector, from, to, value));
        // require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FROM_FAILED');
        IERC20(token).transferFrom(from, to, value);
        return true;
    }
    
    function safeTransferETH(address to, uint value) public returns(bool success){
        payable(to).transfer(value);
        return true;
    }
}