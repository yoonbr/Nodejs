const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const fs = require('fs');

//서버 설정
const app = express();
app.set('port', process.env.PORT || 80);

//로그 출력 설정
app.use(morgan('dev'));

//정적 파일 사용 설정
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
			done(null, 'public/img/');
		},
		filename(req, file, done) {
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}),
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


// 회원가입 처리 

app.get('/member/register', (req, res) => {
	  res.sendFile(path.join(__dirname, '/member/register.html'));
});

app.get('/member/idcheck', (req, res) => {
	//get 방식의 파라미터 가져오기
	const memberid = req.query.memberid;
	connect();
	connection.query('SELECT * FROM member where memberid=?', [memberid], function(err, results, fields) {
		if (err){
			throw err;
		}
		if(results[0]){
			res.json({'result':false}); 
		}else{
			res.json({'result':true}); 
		}
		close();
	});
});

app.get('/member/nicknamecheck', (req, res) => {
	//get 방식의 파라미터 가져오기
	const membernickname = req.query.membernickname;
	connect();
	connection.query('SELECT * FROM member where membernickname=?', [membernickname], function(err, results, fields) {
		if (err){
			throw err;
		}
		if(results[0]){
			res.json({'result':false}); 
		}else{
			res.json({'result':true}); 
		}
		close();
	});
});

app.post('/member/register', (req, res) => {
	//post 방식의 파라미터 가져오기
	const memberid = req.body.memberid;
	const memberpw = req.body.memberpw;
	const membernickname = req.body.membernickname;

	connect();
	connection.query('insert into member(memberid, memberpw, membernickname) values(?, ?, ?)',
			[memberid, memberpw, membernickname], function(err, results, fields) {
		if (err){
			throw err;
		}
		if(results.affectedRows == 1){
			res.json({'result':true}); 
		}else{
			res.json({'result':false}); 
		}
		close();
	});
});

// 로그인 처리 
app.get('/member/login', (req, res) => {
	  res.sendFile(path.join(__dirname, '/member/login.html'));
});

app.post('/member/login', (req, res) => {
	//post 방식의 파라미터 가져오기
	const memberid = req.body.memberid;
	const memberpw = req.body.memberpw;
	connect();
	connection.query('SELECT * FROM member where memberid = ? and memberpw=?', [memberid, memberpw], function(err, results, fields) {
		if (err)
			throw err;
		//데이터가 존재하지 않으면 result에 false를 출력 
		if(results.length == 0){
			res.json({'result':false}); 
		}
		//데이터가 존재하면 result에 true를 출력하고 데이터를 item에 출력
		else{
			res.json({'result':true, 'member':results[0]}); 
		}
		close();
	});
});

//전체 보기 페이지 이동
app.get('/wine/viewall', (req, res) => {
	  res.sendFile(path.join(__dirname, '/wine/viewall.html'));
});

//전체 데이터 가져오기
app.get('/wine/all', (req, res, next) => {
	connect();
	//전체 데이터 가져오기
	var list;
	connection.query('SELECT * FROM wine order by winenum desc', function(err, results, fields) {
		if (err){
			throw err;
		}
		list = results;
		//전체 데이터 개수 가져오기
		connection.query('SELECT count(*) cnt FROM wine', function(err, results, fields) {
			if (err)
				throw err;
			res.json({'count':results[0].cnt, 'list':list}); 
			close();
		});
	});
});

//상세보기 - itemid를 매개변수로 받아서 하나의 데이터를 찾아서 출력해주는 처리 
app.get('/item/getitem', (req, res, next) => {
	itemid = req.params.itemid;
	res.sendFile(path.join(__dirname, '/item/detail.html'));
});
//상세보기 - itemid를 매개변수로 받아서 하나의 데이터를 찾아서 출력해주는 처리 
app.get('/item/detail/:itemid', (req, res, next) => {
	var itemid = req.params.itemid;
	connect();
	connection.query('SELECT * FROM item where itemid = ?', itemid, function(err, results, fields) {
		if (err)
			throw err;
		//데이터가 존재하지 않으면 result에 false를 출력 
		if(results.length == 0){
			res.json({'result':false}); 
		}
		//데이터가 존재하면 result에 true를 출력하고 데이터를 item에 출력
		else{
			res.json({'result':true, 'item':results[0]}); 
		}
		close();
	});
});

//전체 보기 페이지 이동
app.get('/item/list', (req, res) => {
	  res.sendFile(path.join(__dirname, '/item/itemlist.html'));
});
app.get('/item/itemlist', (req, res, next) => {
	//get 방식의 파라미터 가져오기
	const pageno = req.query.pageno;
	const count = req.query.count;

	console.log(count);
	//데이터를 가져올 시작 위치와 데이터 개수 설정
	var start = 0
	var size = 10
	if(pageno != undefined){
		if(count != undefined){
			size = parseInt(count)
		}
		start = (pageno - 1) * size
	}
	//시작위치와 페이지 당 데이터 개수를 설정해서 가져오기
	var list;
	connect();
	connection.query('SELECT * FROM item order by itemid desc limit ?, ?', [start, size], function(err, results, fields) {
		if (err){
			throw err;
		}
		list = results;
		//전체 데이터 개수 가져오기
		connection.query('SELECT count(*) cnt FROM item', function(err, results, fields) {
			if (err)
				throw err;
			res.json({'count':results[0].cnt, 'list':list}); 
			close();

		});
	});
});

//item/paging 요청이 get 방식으로 요청된 경우 처리
//item 디렉토리 안의 paging.html 로 이동
app.get('/item/paging', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/item/paging.html'));
});

// 이미지 다운로드를 위한 코드 
app.get('/item/img/:fileid', function(req, res){
	var fileId = req.params.fileid;
	var file = '/Users/adam/Documents/source/node/nodeserver/public/img' + '/' + fileId;
	console.log("file:" + file);
	mimetype = mime.lookup(fileId);
	console.log("file:" + mimetype);
	res.setHeader('Content-disposition', 'attachment; filename=' + fileId);
	res.setHeader('Content-type', mimetype);
	var filestream = fs.createReadStream(file);
	filestream.pipe(res);
});

//삽입 수정 삭제에 이용할 공통 코드 - 년,월,일, 시,분,초를 저장하기 위한 변수 
var year;
var month;
var day;

var hour;
var minute;
var second;

// 현재 시간을 문자열로 리턴하는 함수
function currentDay() {
	var date = new Date();
	year = date.getFullYear();
	
	// 월을 가져오고 월이 10보다 작으면 앞에 0을 붙임(2자리로 만들기)
	month = date.getMonth() + 1;
	month = month >= 10 ? month:'0' + month;
	
	// 일을 가져오고 일이 10보다 작으면 앞에 0을 붙임(2자리로 만들기)
	day = date.getDate(); 
	day = day >= 10 ? day:'0' + day;
	
	hour = date.getHours(); 
	hour = hour >= 10 ? hour:'0' + hour;
	
	minute = date.getMinutes(); 
	minute = minute >= 10 ? minute:'0' + minute;
	
	second = date.getSeconds();
	second = second >= 10 ? second:'0' + second;
	
}
// 현재 시간을 텍스트 파일에 기록하는 함수 
function updateDate(){
	const writeStream = fs.createWriteStream("./update.txt");
	writeStream.write(year + "-" + month + "-" + day + "-" + hour + ":" + minute + ":" + second)
}

//item/insert 요청이 get 방식으로 요청된 경우 처리 
app.get('/item/insert', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/item/insert.html'));
});

//데이터 삽입을 처리하는 코드 (POST)
//파일 업로드가 있을 때는 , 파일의 업로드 개수 
app.post('/item/insert', upload.single('pictureurl'), 
		(req, res, next) => {
	
	// 파라미터 가져오기 
	const itemname = req.body.itemname;
	const price = req.body.price;
	const description = req.body.description;
	
	// 파일 읽기
	var pictureurl; 
	// 파일이 있는지 물어보기 
	if(req.file){
		pictureurl = req.file.filename
	} else { 
		pictureurl = "default.jpg";
	}
	
	// 데이터 베이스 연결 
	connect();
	// 가장 큰 itemid를 찾아옴 
	connection.query('select max(itemid) maxid from item', 
			function(err, results, fields){
		if(err) {
			throw err;
		}
		var itemid; 
		if(results.length > 0) {
			itemid = results[0].maxid + 1;
		} else {
			itemid = 1;
		}
		
		// 현재 날짜와 시간 가져오기 
		currentDay(); 
		// 데이터 삽입 
				connection.query('insert into item(itemid, itemname, price, description, pictureurl, updatedate) values(?,?,?,?,?,?)', 
						[itemid, itemname, price, description, pictureurl,  year + '-' + month + '-' + day], 
						function(err, results, fields) {
					if(err){
						throw err;
					}
					// 삽입 성공 
					if(results.affectedRows > 0) {
						updateDate();
						res.json({'result':true});
					} else {
						res.json({'result':false});
					}
					
					close();
				})
	})	
})

// item 삭제 요청을 처리할 코드 
app.post('/item/delete', (req, res, netx) => {
	// 파라미터 읽어오기 
	const itemid = req.body.itemid;
	// 현재시간 설정 
	currentDay();
	// 데이터베이스 접속
	connect();
	// SQL 실행 
	connection.query('delete from item where itemid=?', [itemid], 
			function(err, results, fields){
		if(err){
			throw err;
		}
		// 삭제 성공 여부 판단 
		if(results.affectedRows >= 0){
			res.json({'result':true});
		}else{
			res.json({'result':false});
		}
		close();
	})
});

//상세보기에서 수정하기를 클릭했을 때 처리 - 페이지 이동
app.get('/item/update', (req, res, next) => {
	res.sendFile(path.join(__dirname, '/item/update.html'));
});

//수정하기 화면에 수정하기를 클릭했을 때 처리 - 실제 수정을 처리 
//데이터 수정: itemid, itemname, description, price, oldpictureurl, pictureurl(파일)을 받아서 처리
app.post('/item/update', upload.single('pictureurl'), (req, res, next) => {
	
	//파라미터 가져오기 - itemid가 있어야 함 (기존의 아이디 사용)
	const itemid = req.body.itemid;
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;
	const oldpictureurl = req.body.oldpictureurl;

	var pictureurl;
	if(req.file){
		pictureurl = req.file.filename
	}else{
		// 이전에 썼던걸 사용
		pictureurl = oldpictureurl;
	}
	
	connect();
	
	currentDay();
	
	//데이터 수정
	connection.query('update  item set itemname=?, price=?, description=?, pictureurl=?, updatedate=? where itemid=?', 
			[itemname, price, description, pictureurl,  year + '-' + month + '-' + day, itemid], function(err, results, fields) {
		if (err)
			throw err;
		if(results.affectedRows == 1){
			updateDate();

			res.json({'result':true}); 
		}else{
			res.json({'result':false}); 
		}
		close();
	});
});

//마지막 업데이트 된 시간을 리턴하는 처리 
app.get("/item/updatedate", (req, res, next) => {
	fs.readFile('./update.txt', function(err, data){
		console.log(data);
		console.log(data.toString());
		res.json({'result':data.toString()});
	})
});

//** GET 방식의 특징을 알아볼 수 있음 오류발생 해결 -> 정상화 