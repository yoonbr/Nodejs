const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const fs = require('fs');

//서버 설정
const app = express();
app.set('port', process.env.PORT || 9393);

//로그 출력 설정
app.use(morgan('dev'));

//정적 파일이 저장될 디렉토리 설정
app.use(express.static('public'));

//post 방식의 파라미터 읽기
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
	console.error('img 폴더가 없으면 img 폴더를 생성합니다.');
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
		database:'winenote'
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

//get 방식으로 / 요청이 오면 index.html을 출력 
app.get('/', (req, res) => {
	  res.sendFile(path.join(__dirname, '/index.html'));
})

//get 방식으로 item/all 요청이 오면 데이터를 리턴
app.get('/item/all', (req, res, next) => {
	//데이터베이스 연결
	connect();
	//데이터 목록을 저장할 변수
	var list;
	//전체 목록 가져오는 SQL을 실행
	connection.query(
		"select * from item order by itemid desc", 
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

//get 방식으로 /item/viewall 요청이 오면 /item/all.html을 출력 
app.get('/item/viewall', (req, res) => {
	  res.sendFile(path.join(__dirname, '/item/all.html'));
})

//상세보기 서비스 처리
app.get('/item/detail/:itemid', (req, res, next) => {
	//뒤쪽 URL 부분 읽기
	var itemid = req.params.itemid
	//데이터베이스 연결
	connect();
	//데이터 가져오기 SQL 실행
	connection.query('select * from item where itemid=?', 
			[itemid], function(err, results, fields){
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

//item/getitem 요청이 get 방식으로 요청된 경우 처리
//item 디렉토리 안의 detail.html 로 이동
app.get('/item/getitem', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/item/detail.html'));
});

//페이지 단위로 데이터를 넘겨주는 처리
app.get('/item/itemlist', (req, res, next) => {
	//페이지 번호와 데이터 개수를 가져오기 
	//get 방식의 파라미터 읽기
	const pageno = req.query.pageno;
	const count = req.query.count;
	
	//파라미터의 값이 없을때를 위해서 파라미터의 기본값을 설정
	//시작하는 데이터 번호와 페이지 당 데이터 개수 설정
	var start = 0;
	var size = 10;
	
	if(pageno != undefined){
		if(count != undefined){
			size = parseInt(count);
		}
		start = (pageno - 1) * size;
	}
	
	connect();
	connection.query(
		'select * from item order by itemid desc limit ? ,?',
		[start, size], function(err, results, fields){
			if(err){
				throw err;
			}
			var list = results;
			//전체 데이터 개수 가져오기
			connection.query('select count(*) cnt from item',
				function(err, results, fields){
				if(err){throw err;}
				res.json({'count':results[0].cnt, 
					'list':list});
			});
		})
});

//item/paging 요청이 get 방식으로 요청된 경우 처리
//item 디렉토리 안의 paging.html 로 이동
app.get('/item/paging', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/item/paging.html'));
});



