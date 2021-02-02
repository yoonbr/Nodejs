// 웹 서버 모듈 
const http = require('http');
// 파일 처리 모듈 
const fs = require('fs').promises;

// 서버를 생성 
http.createServer(async(req, res) => {
	try {
		// 정상 작동 
		const data = await
		fs.readFile('./server.html');
		res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'})
		res.end
	}catch(err){
		// 에러 발생시
		console.error(err); // err로 log를 표시 
		res.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'});
		res.end(err.message);
	}
}).listen(9393, () => {
	console.log("서버 정상 구동 중....")
})
