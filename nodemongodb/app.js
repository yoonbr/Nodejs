const express = require('express');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

//서버 포트 설정
const app = express();
app.set('port', process.env.PORT || 3003);
app.use(morgan('dev'));

//미들웨어 장착
app.use((err, req, res, next)=> {
	console.error(err);
	res.status(500).send(err.message);
});

//post 방식 파라미터 처리
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended:true
}));

//html 출력 설정
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

//Mongo DB 사용을 위한 기본 설정
var MongoClient = require('mongodb').MongoClient;
var db;
var databaseUrl = 'mongodb://localhost:27017';

//데이터 삽입하기 

//파일을 업로드 하기 위한 설정
try{
	fs.readdirSync('img');
}catch(error){
	console.error('img 폴더가 없어 img 폴더를 생성합니다.');
	fs.mkdirSync('img');
}

const upload = multer({
	storage:multer.diskStorage({
		destination(req, file, done){
			done(null, 'img/');
		},
		filename(req, file, done){
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + 
					Date.now() + ext);
		},
	}), limits:{fileSize:10*1024*1024}
});

app.post('/item/insert', upload.single('pictureurl'), (req, res, next) => {
	//파라미터 읽기
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;
	var pictureurl;
	if(req.file){
		pictureurl = req.file.filename;
	}else{
		pictureurl = "default.jpg";
	}
	
	//Mongo 접속해서 가장 큰 itemid를 찾고 데이터 삽입
	MongoClient.connect(databaseUrl, function(err, database){
		//접속이 안되는 경우 출력
		if(err!=null){
			res.json({'result':false});
		}
		
		//데이터베이스 설정
		db = database.db('node');
		
		db.collection('item').find({},
				{projection:{_id:0, itemid:1}}).sort({itemid:-1})
				.limit(1).toArray(function(err, result){
					var itemid = 1;
					//데이터가 없으면 result가 {}
					//데이터가 있으면 result는 {}의 배열
					
					if(err != null){
						itemid = 1;
					}
					//데이터가 존재하면
					else if(result[0] != null){
						itemid = result[0].itemid + 1;
					}
					
					db.collection("item").insertOne({
						"itemid":itemid,"itemname":itemname,
						"description":description, "price":price,
						"pictureurl":pictureurl}, function(e, result){
							if(e){
								res.json({'result':false});
							}else{
								//현재 시간을 생성
								const date = new Date();
								var year = date.getFullYear();
								var month = date.getMonth() + 1;
								month = month>9?month:'0' + month;
								var day = date.getDate();
								day = day>9?day:'0'+day;
								
								var hour = date.getHours();
								hour = hour>9?hour:'0'+hour;
								var minute = date.getMinutes();
								minute = minute>9?minute:'0'+minute;
								var second = date.getSeconds();
								second = second>0?second:'0'+second;
								
								const writeStream = 
									fs.createWriteStream("./update.txt");
								writeStream.write(year+"-"+month+"-" +
										day+ " " + hour + ":" + 
										minute + ":" + second);
								writeStream.end();
								
								res.json({'result':true});
							}
						});
				});
	});
});

app.get('/item/insert', (req,res,next) => {
	res.render('insert');
});


//데이터가 업데이트 된 시간을 리턴하는 요청
app.get('/item/updatetime', (req, res, next)=>{
	fs.readFile('./update.txt', function(err, data){
		res.json({'result':data.toString()});
	})
});

app.get('/item/list', (req, res, next) => {
	//파라미터 읽기
	const pageno = req.query.pageno;
	const count = req.query.count;
	
	//데이터의 시작 번호와 데이터 개수를 설정
	var start = 1;
	var size = 5;
	
	if(pageno != undefined && count != undefined){
		//자바스크립트는 숫자로 된 문자열을 곱하기에 사용하면 숫자로 변환해서 수행
		start = (pageno - 1) * count;
		//정수로 변환해서 저장 - 파라미터는 기본적으로 문자열
		size = parseInt(count);
	}
	
	//데이터베이스에 접속해서 데이터 가져오기
	MongoClient.connect(databaseUrl, function(err, database){
		if(err != null){
			res.json({'result': false});
		}
		
		db = database.db('node');
		
		//데이터 개수 구하기
		var len = 0;
		db.collection('item').find().toArray(function(err, items){
			len = items.length;
			//데이터를 가져오는 구문
			db.collection('item').find().sort({'itemid':-1})
			.limit(size)
			.toArray(function(err, items){
				res.json({'count':len, 'list':items});
			})
		});
	});
});

//상세보기
app.get('/item/detail', (req, res, next) => {
	//파라미터 읽기
	const itemid = req.query.itemid;
	//데이터 베이스 접속
	MongoClient.connect(databaseUrl, function(err, database){
		if(err != null){
			res.json({'result': false});
		}
		
		db = database.db('node');
		
		//itemid에 해당하는 데이터 찾아오기
		db.collection('item').findOne({'itemid':Number(itemid)}, 
				function(err, item){
			if(item == null){
				res.json({'result':false});
			}else{
				res.json({'result':true, 'item':item});
			}
		})
	});
});

// 데이터 삭제 
app.post("/item/delete", (req, res, next) => {
	const itemid = req.body.itemid;
	
	MongoClient.connect(databaseUrl, function(err, database){
		if(err != null){
			res.json({'result':false});
		}
		db = database.db('node');
		db.collection('item').deleteOne({'itemid':Number(itemid)},
				function(err, result){
			if(result.result.n == 0){
				res.json({'result':false});
			}else{
				//현재 시간을 생성
				const date = new Date();
				var year = date.getFullYear();
				var month = date.getMonth() + 1;
				month = month>9?month:'0' + month;
				var day = date.getDate();
				day = day>9?day:'0'+day;
				
				var hour = date.getHours();
				hour = hour>9?hour:'0'+hour;
				var minute = date.getMinutes();
				minute = minute>9?minute:'0'+minute;
				var second = date.getSeconds();
				second = second>9?second:'0'+second;
				
				const writeStream = 
					fs.createWriteStream("./update.txt");
				writeStream.write(year+"-"+month+"-" +
						day+ " " + hour + ":" + 
						minute + ":" + second);
				writeStream.end();
				
				res.json({'result':true});
			}
		});
	});
});

app.get('/item/delete', (req, res, next) => {
	res.render('delete');
});

// 파일 다운로드 
var util = require('util');
var mime = require('mime');

app.get('/img/:fileid', function(req, res){
	var fileid = req.params.fileid;
	var file = '/Users/yoonbr/Node/nodemongodb/img' + '/' + fileid;
	
	mimetype = mime.lookup(fileid);
	res.setHeader('Content-disposition',
			'attachment;filename=' + fileid);
	res.setHeader('Content-type', mimetype);
	var filestream = fs.createReadStream(file);
	filestream.pipe(res);
});

//서버 구동
app.listen(app.get('port'), () => {
	console.log(app.get('port'), '번 포트로 서버 구동 중');
})