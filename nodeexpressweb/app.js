// express 모듈의 내용을 가져와서 express 라는 이름으로 묶어서 사용
const express = require('express')
const path = require('path')

const app = express()

// 포트 번호 설정 
app.set('port', process.env.PORT || 3000)
// 여기까지가 tomcat 생성 

//미들웨어 장착 
app.use((req, res, next) => {
	console.log("모든 요청에 반응")
	next();
})

// 시작 요청이 get 방식으로 오면 
app.get('/', (req, res, next) => {
	// res.send('Hello Express')
	// res.sendFile(path.join(__dirname, '/index.html'))
	console.log("/ 의 GET 요청에 반응")
});

// 서버 실행 
app.listen(app.get('port'), () => {
	console.log(app.get('port'), '번 포트에서 서버 대기 중')
});