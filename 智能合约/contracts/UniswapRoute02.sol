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

    // ?????????????????????eth???????????????eth???????????????????????????????????????????????????
    // ??????????????????????????????eth?????????????????????
    receive() external payable {
        // ??????????????????weth???????????????????????????
        assert(msg.sender == _WETH);
    }

    function _addLiquidity(    
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin) private returns(uint amountA, uint amountB){
        // ??????pair??????????????????
        address pair_addr = IUniswapV2Factory(_factory).getPair(tokenA, tokenB);
        if (pair_addr == address(0)) {
            IUniswapV2Factory(_factory).createPair(tokenA, tokenB);
        }
        
        // ??????????????????????????????
        // ??????????????????????????????
        // ??????????????????????????????????????????
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
        // ???????????????
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        // ??????pair????????????
        address pair = UniswapV2Library.pairFor(_factory, tokenA, tokenB);
        // ????????????token??????pair??????
        TransferHelper.safeTransferFrom(msg.sender, tokenA, pair, amountA);
        TransferHelper.safeTransferFrom(msg.sender, tokenB, pair, amountB);
        // // mint ?????????
        liquidity = IUniswapV2Pair(pair).mint(to);// to????????????to??????????????????
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
        // ??????
        for(uint i;i<path.length-1;i++){
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = UniswapV2Library.sortTokens(input, output);
            IUniswapV2Pair pair = IUniswapV2Pair(UniswapV2Library.pairFor(_factory, path[i], path[i+1]));
            uint amountInput;
            uint amountOutput;
            {// Stack too deep error
                // ????????????
                (uint reserve0, uint reserve1,) = pair.getReserves();
                // ????????????????????????????????????reserve?????????????????????????????????
                (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            
                // ????????????????????????
                amountInput = IERC20(input).balanceOf(address(pair)) - reserveInput;
                //????????????????????????
                amountOutput = getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            // ?????????????????????path????????????????????????pair????????????????????????????????????????????????
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(_factory, output, path[i + 2]) : _to;
            // ????????????????????????????????????token0????????????????????????????????????
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    // ????????????????????????????????????xxx?????????????????????????????????????????????
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) public  override ensure(deadline){

        // ??????????????????????????????pair?????????
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

    // ????????????eth?????????token
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) public override payable ensure(deadline){
        require(path[0] == _WETH, 'invalid path');
        require(path.length >=2, 'path too short');
        uint amountIn = msg.value;
        // 1. ??????
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
        // ???????????????
        (amountToken, amountETH) = _addLiquidity(token, _WETH, amountTokenDesired, msg.value, amountTokenMin, amountETHMin);
        // require(amountETH <= msg.value, 'router02:insufficient eth in');
        // ??????pair????????????
        address pair = UniswapV2Library.pairFor(_factory, token, _WETH);
        // ????????????token??????pair??????
        TransferHelper.safeTransferFrom(msg.sender, token, pair, amountToken);
        // ?????????????????????eth?????????weth
        IWETH10(_WETH).deposit{value:amountETH}();
        // ???weth????????????pair??????
        assert(IWETH10(_WETH).transfer(pair, amountETH)); // ??????????????????????????????assert
        // mint ?????????
        IUniswapV2Pair(pair).mint(to);// to????????????to??????????????????
        if(amountETH < msg.value){ // ???????????????????????????????????????
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
    ) public override returns (uint amountToken, uint amountETH){
    //??????????????????????????????????????????LP??????pair???, 
//??????????????????????????????permit/apporve, 
//?????????????????????vrs????????????, ??????token??????permit??????,permit?????????approve,???allowance?????????????????????
//??????????????????,?????????approve,??????????????????
    }


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

    // ????????????????????????????????????k?????????
    function quote(uint amountA, uint reserveA, uint reserveB) public override pure returns (uint amountB){
        return UniswapV2Library.quote(amountA, reserveA, reserveB);
    }

    // swap????????????
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public override pure returns (uint amountOut){
        return UniswapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    // swap????????????
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public override pure returns (uint amountIn){
        return UniswapV2Library.getAmountIn(amountOut, reserveOut, reserveIn);
    }

    // swap????????????
    function getAmountsOut(uint amountIn, address[] calldata path) public override view returns (uint[] memory amounts){
        return UniswapV2Library.getAmountsOut(_factory, amountIn, path);
    }

    // swap????????????
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
        // ?????????pair??????hash????????????, ???????????????????????????pair??????
        (address tokenA, address tokenB) = sortTokens(token0, token1);
        bytes32 m = keccak256(abi.encodePacked(
            hex'ff',
            factory,
            keccak256(abi.encodePacked(tokenA, tokenB)), // salt
            hex'958fd6f0a8d8b8e424e8328de68f015a344ea5ddf90f658f81b626c6d886ec1c' // pair?????????bytecode???keccak256(??????????????????json??????????????????bytecode??? ????????????keccak256)
        ));
        pair = _convert(m);
    }

    // ??????????????????k?????????
    function quote(uint amountA, uint reserveA, uint reserveB) pure public returns(uint amountB){
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // ??????????????????????????????????????????????????????????????????
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

    // swap????????????, ???????????????????????????????????????????????????????????????????????????????????????
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public  pure returns (uint amountOut){
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        // reserveIn * reserveOut == (reserveIn + amountIn * 0.997) * (reserveOut - amountOut)
        // ?????????????????????????????????????????????
        // ????????????????????? = 0.997 * ??????
        uint amountInWithFee = amountIn.mul(997);
        // ????????? ??????????????? * ??????out
        uint numerator = amountInWithFee.mul(reserveOut);
        // ????????? ??????in + ?????????????????? * 0.001
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
        // amountOut = amountIn * 997 * reserveOut / (reserveIn * 1000 + amountIn * 997);
    }

    // swap????????????
    function getAmountsOut(address _factory, uint amountIn, address[] calldata path) public  view returns (uint[] memory amounts){
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for(uint i; i < path.length - 1;i++){
            (uint reserveIn, uint reserveOut) = getReserves(_factory, path[i], path[i+1]);
            amounts[i+1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        } 
    }

    // swap????????????
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
