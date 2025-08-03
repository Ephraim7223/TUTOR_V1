import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import connectDB from './SRC/DB/database.js'
import router from './SRC/routes/index.js'

dotenv.config()

const app = express()

app.use(cors({origin:"*"}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use('/api/v1', router)

const startServer  = async () => {
   const PORT  = process.env.PORT || 2345
   connectDB()
   try {
      app.listen(PORT,() => {console.log(`J-SQUAD IS RUNNING ON PORT: ${PORT}`);})
   } catch (error) {
      console.log(error);
   }
};

startServer();

app.get("/", (req,res) => {
   res.send('API IS RUNNING')
})