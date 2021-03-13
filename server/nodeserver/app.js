const express = require('express')
const morgan = require('morgan')
const path = require('path')
const mysql = require('mysql')
const multer = require('multer')
const fs = require('fs')

// 9393번 포트로 서버 설정
// 80(http), 443(https) - 포트번호를 적을 필요 없음 
const app = express()
app.set('port', process.env.PORT || 80)

// 로그 출력 설정 
app.use(morgan('dev'))

// 정적파일(public) 사용 설정 
app.use(express.static('public'))

// post 방식의 파라미터 읽기
// GET 서버에게 데이터를 전달을 할때 URL을 붙여서 전달 - 장점 : 자동 재전송 , 대신 파라미터가 256자 넘을 수 없고 URL 방식이라 보안이 취약 
// POST 자동 재전송이 안됨 , 보안 GET보다 // 조회 제외 무조건 POST, 보낼 때 비밀번호 textview file - POST
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

//파일 다운로드를 위한 설정 
// 앱은 링크로 파일을 다운로드 받을 수 없기때문에 
var util = require('util')
var mime = require('mime')

//에러가 발생한 경우 처리
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).send(err.message)
});

//파일 업로드를 위한 설정 'public/img'
//img 디렉토리를 연결
try {
	fs.readdirSync('public/img');
} catch (error) {
	console.error('img 폴더가 없으면 img 폴더를 생성합니다.');
	fs.mkdirSync('public/img');
}

//파일 이름은 기본 파일 이름에 현재 시간을 추가해서 생성
const upload = multer({
	storage: multer.diskStorage({
		destination(req, file, done) {
			// 업로드 디렉토리 설정 
			done(null, 'public/img/');
		},
		filename(req, file, done) {
			// 파일 이름 결정 
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}),
	// 파일 최대 크기 설정 
	limits: { fileSize: 10 * 1024 * 1024 },
});

// 파일 업로드때 고민할 사항 : 파일 이름 생성 (고유해야 함) 고유한 파일 이름 생성법 
// 1. 현재시간을 붙임 2. UUID(128 숫자문자조합) 사용 3. 잡 코리아 같은 사이트..? - 아이디(고유)를 붙임 

// 데이터베이스 연결 
var connection;
function connect(){
	connection = mysql.createConnection({
		host :'localhost',
		port : 3306,
		user : 'root',
		password : '',
		database:'wine'
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}else{
			console.log('mysql connection success');
		}
	});
}

function close(){
	console.log('mysql connection close');
	connection.end();
}

//서버 실행
app.listen(app.get('port'), () => {
	console.log(app.get('port'), '번 포트에서 대기 중');
});

// get 방식으로 / 요청이 오면 index.html 출력 
app.get('/', (req, res) => {
	  res.sendFile(path.join(__dirname, '/index.html'));
})

// get 방식으로 /wn/all 요청이 오면 데이터를 리턴 
app.get('/wn/all', (req, res, next) => {
	// 데이터베이스 연결 
	connect()
	// 데이터 목록을 저장할 변수 
	var list
	// 전체 목록을 가져오는 SQL 실행 
	connection.query("select * from wsearch order by winenum",
	// connection.query("select * from wn_search order by winenum desc",
			function(err, results, fields){
		// err은 에러 객체 
		//result는 SQL 실행 결과 
		if(err){
			throw err;
		}
		// 에러가 없는 경우 - 가져온 목록을 list에 저장 
		// 결과는 항상 배열 
		list = results;
		res.json({'count':list.length, 'list':list});
		// 데이터베이스 닫기 
		close();
		
	})
})

// get 방식으로 /wn/viewall 요청이 오면 /note/all.html을 출력 
app.get('/wn/viewall', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/note/all.html'));
})

// 상세보기 서비스 처리 
app.get('/wn/detail/:winenum', (req, res, next) => {
	// 뒤쪽 URL 부분 읽기 
	var itemid = req.params.winenum
	// 데이터베이스 연결 
	connect()
	// 데이터 가져오기 SQL 실행 
	connection.query("select * from wsearch where winenum=?", [winenum], 
			function(err, results, fields){ 
				if(err){
					throw err;
				}
				
				// 데이터 가져왔는지 확인 
				if(results.length == 0) {
					res.json({'result':false})
				} else {
					res.json({'result':true, 'note':results[0]})
				}
				// 데이터베이스 닫기 
				close();
	})
})

// wn/getwine 요청이 get 방식으로 요청된 경우 처리 
app.get('/wn/getwine', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/note/detail.html'));
})

// 페이지 단위로 데이터를 넘겨주는 처리 
app.get('/note/winelist', (req, res, next) => {
	// 페이지 번호와 데이터 개수 가져오기 
	// get 방식의 파라미터 읽기
	const pageno = req.query.pageno;
	const count = req.query.count;
	
	// 파라미터의 값이 없을때를 위해서 파라미터의 기본 값을 설정
	var start = 0;
	var size = 2;
	
	if(pageno != undefined) {
		if(count != undefined) {
			size = parseInt(count)
		}
		start = (pageno - 1) * size 
	}
	
	connect()
	connection.query(
			'select * from wsearch order by winenum desc limit ?, ?', [start, size], 
			function(err, results, fields){
				if(err){
					throw err;
				}
			}
			var list = results
			// 전체 데터 개수 가져오기 
			
	
})


