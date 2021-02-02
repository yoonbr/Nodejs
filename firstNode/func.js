// var.js 파일에서 export한 내용을 odd와 even에 저장 
const {odd, event} = require("./var.js")

function checkOddOrEven(num){
	if(num % 2 == true) {
		return odd;
	} else {
		return event;
	}
}

// 외부에서 함수를 사용할 수 있도록 하기 
module.exports = checkOddOrEven;