const express = require('express');
const app = express();
const port = 3002;
const morgan = require('morgan');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(cookieParser());
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');

app.use(express.json());
// Cấu hình morgan để log request
app.use(morgan('combined'));

// Cấu hình CORS cho phép frontend từ localhost:4200 kết nối với backend trên localhost:3002
const corsOptions = {
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Sử dụng CORS cho tất cả các route
app.use(cors(corsOptions));

// MongoDB kết nối
const client = new MongoClient('mongodb://127.0.0.1:27017', { useNewUrlParser: true, useUnifiedTopology: true });
let fashionCollection, userCollection;

// Cấu hình multer cho file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

client.connect()
  .then(() => {
    console.log('MongoDB connected');

    const database = client.db('FashionData');
    fashionCollection = database.collection('Fashion');
    userCollection = database.collection('User');

    // Route mặc định
    app.get("/", (req, res) => {
      res.send("This Web server is processed for MongoDB");
    });

    // Route lấy danh sách thời trang
    app.get("/fashions", async (req, res) => {
      try {
        const result = await fashionCollection.find({}).toArray();
        res.json(result);
      } catch (error) {
        console.error('Error fetching data from MongoDB:', error);
        res.status(500).send('Error fetching data from MongoDB');
      }
    });

    // Route lấy thông tin theo ID
    app.get("/fashions/:id", async (req, res) => {
      try {
        const o_id = new ObjectId(req.params.id);
        const result = await fashionCollection.findOne({ _id: o_id });
        if (result) {
          res.json(result);
        } else {
          res.status(404).send('Fashion item not found');
        }
      } catch (error) {
        console.error('Error fetching fashion item:', error);
        res.status(500).send('Error fetching fashion item');
      }
    });

    // Route để đăng ký thời trang với file upload
    app.post("/fashions", upload.single('fashion_image'), async (req, res) => {
      try {
        const fashionData = {
          style: req.body.style,
          fashion_subject: req.body.fashion_subject,
          fashion_detail: req.body.fashion_detail,
          fashion_image: req.file ? req.file.buffer.toString('base64') : null // Chuyển đổi thành chuỗi base64
        };

        await fashionCollection.insertOne(fashionData);
        res.json(fashionData);
      } catch (error) {
        console.error('Error saving fashion data:', error);
        res.status(500).send('Error saving fashion data');
      }
    });
    
    app.get("/auth/read-cookie", (req, res) => {
      const username = req.cookies.username || 'Guest'; // Lấy username từ cookie
      res.send({ username }); // Trả về username
    });
    
    app.get("/auth/clear-cookie", (req, res) => {
      res.clearCookie("username");
      res.clearCookie("password");
      res.send("Cookies for username and password have been removed");
    });

    app.post("/auth/login", async (req, res) => {
      const { username, password } = req.body; // Thay đổi từ name thành username
    
      console.log('Login attempt with:', { username, password });
    
      try {
        const user = await userCollection.findOne({ username: username }); // Tìm người dùng theo username
    
        if (user) {
          // So sánh mật khẩu
          if (user.password === password) {
            res.cookie("username", user.username, { httpOnly: true, maxAge: 86400000 });
            res.send({ message: 'Login successful', user });
          } else {
            res.status(401).send('Invalid username or password'); // Sai mật khẩu
          }
        } else {
          res.status(401).send('Invalid username or password'); // Không tìm thấy người dùng
        }
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).send('Error logging in');
      }
    });
    
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Lắng nghe trên cổng 3000
app.listen(port, () => {
  console.log(`My Server listening on port ${port}`);
});