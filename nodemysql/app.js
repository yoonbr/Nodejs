const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const fs = require('fs');

//서버 설정
const app = express();
app.set('port', process.env.PORT || 3001);

//로그 출력 설정
app.use(morgan('dev'));

//post 방식의 파라미터 읽기
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

//res.render 로 html 파일을 출력하기 위한 설정 - views 디렉토리에 html이 존재해야 함
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

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
	fs.readdirSync('img');
} catch (error) {
	console.error('img 폴더가 없으므로 img 폴더를 생성합니다.');
	fs.mkdirSync('img');
}

//파일이름은 기본 파일 이름에 현재 시간을 추가해서 생성
const upload = multer({
	storage: multer.diskStorage({
		destination(req, file, done) {
			done(null, 'img/');
		},
		filename(req, file, done) {
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

//서버 실행
app.listen(app.get('port'), () => {
	console.log(app.get('port'), '번 포트에서 대기 중');
});

// 전체 데이터 가져오기 
app.get('/item/all', (req, res, next) => {
	// 데이터베이스 연결 
	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err){
		if(err){
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});
	
	// 테이블의 모든 데이터 가져오기 
	var list; 
	connection.query('select * from goods order by itemid desc', function(err, results, fields) {
		if(err) 
			throw err;
		list = results;
		// 전체 데이터 개수 가져오기 
		connection.query('select count(*) cnt from goods', function(err, results, fields){
			if(err)
				throw err;
			res.json({'count':results[0].cnt, 'list':list});
		})
	})
})
// check 
	
// 아이템 목록 보기 : 페이지 번호와 한 페이지 당 가져올 데이터 개수를 설정해서 데이터를 가져옴 페이지 번호와 데이터 개수를 생략하면 기본값 사용
// 결과는 count에 전체 데이터 개수 그리고 list에 데이터 목록을 출력
app.get('/item/list', (req, res, next) => {
	
	// get 방식의 파라미터 가져오기 
	const pageno = req.query.pageno;
	const count = req.query.count;
	
	// 데이터를 가져올 시작 위치와 데이터 개수 설정 
	var start = 0
	var size = 5
	if(pageno != undefined && count != undefined){
		start = (pageno -1) * count
		size = parseInt(count)
	}
	
	// 데이터베이스 연결 
	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});
	
	// 시작위치와 페이지 당 데이터 개수를 설정해서 가져오기 
	var list;
	connection.query('select * from goods order by itemid desc limit ?, ?', [start, size], function(err, results, fields) {
		if (err){
			throw err;
		}
		list = results;
		// 전체 데이터 개수 가져오기
		connection.query('select count(*) cnt from goods', function(err, results, fields) {
			if(err)
				throw err;
			res.json({'count':results[0].cnt, 'list':list})
		})
	})
})

// 상세보기 - itemid를 매개변수로 받아서 하나의 데이터를 찾아서 출력해주는 처리 
app.get('/item/detail', (req, res, next) => {
	const itemid = req.query.itemid;
	
	// 데이터베이스 연결 
	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});
	
	connection.query('select * from item where itemid = ?', itemid, function(err, results, fields) {
		if(err)
			throw err;
		// 데이터가 존재하지 않으면 result에 false를 출력 
		if(results.length == 0){
			res.json({'result':false});
		}
		// 데이터가 존재하면 result에 true를 출력하고 데이터를 item에 출력 
		else{
			res.json({'result':true, 'item':results[0]})
		}
	})
})
// check 

// 데이터 삽입 : itemname, description, price, pictureurl(파일)을 받아서 처리 
// itemid는 가장 큰 itemid를 찾아서 + 1
app.post('/item/insert', upload.single('pictureurl'), (req, res, next) => {
	// 파라미터 가져오기 
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;
	var pictureurl;
	if(req.file){
		pictureurl = req.file.filename
	}else{
		pictureurl = "default.jpg";
	}
	
	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});
	// 가장 큰 itemid 가져오기 
	connection.query('select max(itemid) maxid from goods', function(err, results, fields) {
		if (err)
			throw err;
		var itemid;
		if(results.length > 0){
			itemid = results[0].maxid + 1
		}else{
			itemid = 1;
		}
		
		//현재 시간의 년월일 시분초 가져오기
		var date = new Date()
		var year = date.getFullYear();
		var month = (1 + date.getMonth());
		month = month >= 10 ? month : '0' + month;
		var day = date.getDate();
		day = day >= 10 ? day : '0' + day;

		var hour = date.getHours();
		hour = hour >= 10 ? hour : '0' + hour;
		var minute = date.getMinutes();
		minute = minute >= 10 ? minute : '0' + minute;
		var second = date.getSeconds();
		second = second >= 10 ? second : '0' + second;
		
		//데이터 삽입
		connection.query('insert into goods(itemid, itemname, price, description, pictureurl, updatedate) values(?,?,?,?,?,?)', 
				[itemid, itemname, price, description, pictureurl,  year + '-' + month + '-' + day], function(err, results, fields) {
			if (err)
				throw err;
			console.log(results)
			if(results.affectedRows == 1){
				const writeStream = fs.createWriteStream('./update.txt');
				writeStream.write(year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second);
				writeStream.end();

				res.json({'result':true}); 
			}else{
				res.json({'result':false}); 
			}
		});
	});
});

app.get('/item/insert', (req, res, next) => {
	res.render('insert'); 
});
	
//데이터 수정: itemid, itemname, description, price, oldpictureurl, pictureurl(파일)을 받아서 처리
app.post('/item/update', upload.single('pictureurl'), (req, res, next) => {
	//파라미터 가져오기
	const itemid = req.body.itemid;
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;
	const oldpictureurl = req.body.oldpictureurl;

	var pictureurl;
	if(req.file){
		pictureurl = req.file.filename
	}else{
		pictureurl = oldpictureurl;
	}	

	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});

	//현재 시간의 년월일 시분초 가져오기
	var date = new Date()
	var year = date.getFullYear();
	var month = (1 + date.getMonth());
	month = month >= 10 ? month : '0' + month;
	var day = date.getDate();
	day = day >= 10 ? day : '0' + day;

	var hour = date.getHours();
	hour = hour >= 10 ? hour : '0' + hour;
	var minute = date.getMinutes();
	minute = minute >= 10 ? minute : '0' + minute;
	var second = date.getSeconds();
	second = second >= 10 ? second : '0' + second;

	//데이터 수정
	connection.query('update  goods set itemname=?, price=?, description=?, pictureurl=?, updatedate=? where itemid=?', 
			[itemname, price, description, pictureurl,  year + '-' + month + '-' + day, itemid], function(err, results, fields) {
		if (err)
			throw err;
		console.log(results)
		if(results.affectedRows == 1){
			const writeStream = fs.createWriteStream('./update.txt');
			writeStream.write(year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second);
			writeStream.end();

			res.json({'result':true}); 
		}else{
			res.json({'result':false}); 
		}
	});
});

app.get('/item/update', (req, res, next) => {
	res.render('update'); 
});


app.post('/item/delete', (req, res, next) => {
	const itemid = req.body.itemid;
	
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	month = month >= 10 ? month : '0' + month;
	var day = date.getDate();
	day = day >= 10 ? day : '0' + day;

	var hour = date.getHours();
	hour = hour >= 10 ? hour : '0' + hour;
	var minute = date.getMinutes();
	minute = minute >= 10 ? minute : '0' + minute;
	var second = date.getSeconds();
	second = second >= 10 ? second : '0' + second;

	var connection = mysql.createConnection({
		host:'localhost',
		port:'3306',
		user:'root',
		password:'',
		database:'yoond'		
	});
	connection.connect(function(err) {
		if (err) {
			console.log('mysql connection error');
			console.log(err);
			throw err;
		}
	});

	connection.query('delete FROM goods where itemid = ?', itemid, function(err, results, fields) {
		if (err)
			throw err;
		console.log(results)
		if(results.affectedRows == 1){
			const writeStream = fs.createWriteStream('./update.txt');
			writeStream.write(year + '-' + month + '-' + day + " " + hour + ":" + minute + ":" + second);
			writeStream.end();
			res.json({'result':true}); 
		}else{

			res.json({'result':false}); 
		}
	});
});

app.get('/item/delete', (req, res, next) => {
	res.render('delete'); 
});


app.get('/item/date', (req, res, next) => {
	fs.readFile('./update.txt', function (err, data) { 
		res.rander({'result':data.toString()}); 
	});
});

app.get('/img/:fileid', function(req, res){
	var fileId = req.params.fileid;
	var file = '/Users/yoonbr/Node/nodemysql/img' + '/' + fileId;
	console.log("file:" + file);
	mimetype = mime.lookup(fileId);
	console.log("file:" + mimetype);
	res.setHeader('Content-disposition', 'attachment; filename=' + fileId);
	res.setHeader('Content-type', mimetype);
	var filestream = fs.createReadStream(file);
	filestream.pipe(res);
});
	
	
	























