// require('dotenv').config()
import dotenv from "dotenv"
import mongoose  from "mongoose";
import { DB_NAME } from "./constants.js";
//when we try to connect whith data base we shoul use try catch cause we have vary high chance of error
import express from "express"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log('server is runing at port:',process.env.PORT)
    })
})
.catch((error)=>{
    console.log('mongo db connection fail!!!!!!!',error);
})









/*
(async () =>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("error:",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log('app is listening on port:',process.env.PORT);
            
        })

    }catch(error){
        console.log('ERROR:' ,error)
        throw error;
    }
})()
    */
