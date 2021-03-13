const express = require('express')
const morgan = require('morgan')
const path = require('path')
const mysql = require('mysql')
const multer = require('multer')
const fs = require('fs')

// 80번 포트로 서버 설정
const app = express()
app.set('port', process.env.PORT || 80)

// 로그 출력 설정 
app.use(morgan('dev'))

// 정적 파일이 저장될 디렉토리로 설정 
app.use(express.static('public'))

// post 방식의 파라미터 읽기
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

//파일 다운로드를 위한 설정 
var util = require('util')
var mime = require('mime')

//에러가 발생한 경우 처리
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).send(err.message)
});

//파일 업로드를 위한 설정
//img 디렉토리를 연결
try {
	fs.readdirSync('public/img');
} catch (error) {
	console.error('img 폴더가 없으므로 img 폴더를 생성합니다.');
	fs.mkdirSync('public/img');
}
//파일 이름은 기본 파일 이름에 현재 시간을 추가해서 생성
const upload = multer({
	storage: multer.diskStorage({
		destination(req, file, done) {
			//업로드할 디렉토리 설정
			done(null, 'public/img/');
		},
		filename(req, file, done) {
			//파일 이름 결정
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}),
	//파일의 최대 크기 설정
	limits: { fileSize: 10 * 1024 * 1024 },
});

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

app.get('/', (req, res) => {
	  res.sendFile(path.join(__dirname, '/index.html'));
})

//get 방식으로 item/all 요청이 오면 데이터를 리턴
app.get('/note/all', (req, res, next) => {
//데이터베이스 연결
	connect();
	//데이터 목록을 저장할 변수
	var list;
	//전체 목록 가져오는 SQL을 실행
	connection.query(
		"select * from wsearch order by winenum desc", 
		function(err, results, fields){
			//err은 에러 객체
			//results는 SQL 실행 결과
			if(err){
				throw err;
			}
			//에러가 없는 경우 - 가져온 목록을 list 에 저장
			//결과는 항상 배열입니다.
			list = results;
			res.json({'count':list.length, 'list':list});
			//데이터베이스 닫기
			close();
		})
});

//get 방식으로 /note/viewall 요청이 오면 /item/all.html을 출력 
app.get('/note/viewall', (req, res) => {
	  res.sendFile(path.join(__dirname, '/note/all.html'));
})

//상세보기 서비스 처리
app.get('/note/detail/:winenum', (req, res, next) => {
	//뒤쪽 URL 부분 읽기
	var winenum = req.params.winenum
	//데이터베이스 연결
	connect();
	//데이터 가져오기 SQL 실행
	connection.query('select winename, vintage, varieties, country, wineimg, notenum from wsearch left join wnote on wnote.winenum = wsearch.winenum where wsearch.winenum = 1', 
			[winenum], function(err, results, fields){
		if(err){
			throw err;
		}
		
		//데이터 가져왔는지 확인
		if(results.length == 0){
			res.json({'result':false});
		}else{
			res.json({'result':true, 'item':results[0]})
		}
		close();
	});
});

//note/getnote 요청이 get 방식으로 요청된 경우 처리
//note 디렉토리 안의 detail.html 로 이동
app.get('/note/getnote', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/note/detail.html'));
});