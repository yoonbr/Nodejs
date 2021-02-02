// var 로도 사용 가능
const fs = require('fs')

console.log('start')
fs.readFile('./test.txt', (err, data) => {
	if(err != null){
		console.log('에러 발생')
	} else {
		console.log('1번', data.toString())
	}
});

fs.readFile('./test.txt', (err, data) => {
	if(err != null){
		console.log('에러 발생')
	} else {
		console.log('2번', data.toString())
	}
});

fs.readFile('./test.txt', (err, data) => {
	if(err != null){
		console.log('에러 발생')
	} else {
		console.log('3번', data.toString())
	}
});

console.log('end')