const Joi =require('joi');
const User=require('../models/users');
const bcrypt= require('bcryptjs');
const userDTO = require('../dto/user')
const JWTService = require('../services/JWTService');
const RefreshToken = require('../models/token');
const token = require('../models/token');
const auth = require('../middlewares/auth');

const passwordpattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

const authController={
    async register(req, res, next) {
        // validate user data
        const userRegisterSchema = Joi.object({
          username: Joi.string().min(5).max(30).required(),
          name: Joi.string().max(30).required(),
          email: Joi.string().email().required(),
          password: Joi.string().pattern(passwordpattern).required(),
          confirmPassword: Joi.ref('password'),
        });
      
        const { error } = userRegisterSchema.validate(req.body);
      
        // if error in validation -> return error in a middleware
        if (error) {
          return next(error);
        }
      
        // if email or username is already registered -> return an error
        const { username, name, email, password, confirmPassword } = req.body;
      
        if (password !== confirmPassword) {
          const error = {
            status: 400,
            message: 'Password and confirmation password do not match',
          };
          return next(error);
        }
      
        try {
          const emailInUse = await User.exists({ email });
          const usernameInUse = await User.exists({ username });
      
          if (emailInUse) {
            const error = {
              status: 409,
              message: 'Email already registered',
            };
            return next(error);
          }
          if (usernameInUse) {
            const error = {
              status: 409,
              message: 'Username already registered',
            };
            return next(error);
          }
      
          // password hash
          const hashedPassword = await bcrypt.hash(password, 10);
      
          // store user data in db
          let accessToken;
          let refreshToken;
          let user;
          try{

            const userToRegister = new User({
              username,
              name,
              email,
              password: hashedPassword,

              
            });
             user = await userToRegister.save();
            //token gernation
            accessToken = JWTService.signAccessToken({_id: user._id, }, '30m');

            refreshToken = JWTService.signRefreshToken({_id: user._id}, '60m');

          }
          catch(error)
          {
            return next(error);
          }
          //store refresh token in database
          await JWTService.storeRefreshToken(refreshToken,user._id);
            
          //send token in cookie
          res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60* 24 ,
            httpOnly: true  
          });

          res.cookie('refreshToken', refreshToken,{
            maxAge: 1000 * 60 * 60* 24 ,
            httpOnly: true

          });
          try {

            
            // return user data in response

            return res.status(201).json({ user:userDTO, auth: true});
          } catch (error) {
            return next(error);
          }
        } catch (error) {
          return next(error);
        }
      },
      async login(req, res, next) {
        // validate user input
        const userLoginSchema = Joi.object({
          username: Joi.string().min(5).max(30).required(),
          password: Joi.string().pattern(passwordpattern).required(),
        });
      
        const { error } = userLoginSchema.validate(req.body);
      
        // validation error, return error
        if (error) {
          return next(error);
        }
      
        const { username, password } = req.body;
      
        let user;
        try {
          // match username
          user = await User.findOne({ username: username });
      
          if (!user) {
            const error = {
              status: 401,
              message: 'Invalid username or password',
            };
            return next(error);
          }
      
          // match password
          const match = await bcrypt.compare(password, user.password);
      
          if (!match) {
            const error = {
              status: 401,
              message: 'Invalid username or password',
            };
            return next(error);
          }
          
        } catch (error) {
          return next(error);
        }

        const accessToken =JWTService.signAccessToken({_id:user._id}, '30m');
        const refreshToken = JWTService.signRefreshToken({_id:user._id},'60m')

        //update refresh token in database
       
       try{
      await RefreshToken.updateOne({
          _id: user._id
        },
          {token:refreshToken},
          { upsert:true}
      )

      }

      catch(error){
        return next(error)

      }
        
        
        res.cookie('accessToken', accessToken,{
          maxAge: 1000 * 60 * 60 * 24,
          httpOnly : true
        });

        res.cookie('refreshToken',refreshToken,{
          maxAge: 1000 * 60 * 60 * 24, 
          httpOnly : true
        });




        const userDto = new userDTO(user);
          // return user data in response
          return res.status(200).json({ user: userDto , auth: true});
    },
    async logout(req,res,next){
      // delete refresh token from database
      const {refreshToken} = req.cookies;
      try{
       await RefreshToken.deleteOne({
          token: refreshToken
        });
      }
      catch(error){
        return next(error);
      }

      //delete cookie
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      //response
      res.status(200).json({user:null,auth: false});
    },
    async refresh(req, res, next){
      // get resfresh token from cookies

      //verify refreshToken

      //gernate new tokens

      //update database, return response

      const orignalRefreshToken = req.cookies.refreshToken;
      let id;
      try{
        id= JWTService.verifyRefreshToken(orignalRefreshToken)._id;
      }
      catch(err){
        const error={
          status: 401,
          message: 'Unauthorized',
        }

        return next(error);
      }

      try{
        const match= RefreshToken.findOne({_id: id, token: orignalRefreshToken });
        if(!match){
          const error={
            status: 401,
            message: 'Unauthorizes'
          }
          
          return next(error);
        }

      }
      catch(err)
      {
        return next(err);
      }

      try{
        const accessToken = JWTService.signAccessToken({_id: id}, '30m');
        const refreshToken = JWTService.signRefreshToken({_id: id },'60m');

       await RefreshToken.updateOne({_id: id},{token: refreshToken});
       
       res.cookie('accessToken',accessToken,{
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       })

       res.cookie('refreshToken',refreshToken,{
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
       })

      }
      catch(error){
        return next(error);
      }
      const user= await User.findOne({_id: id});
      
      const userDto = new userDTO(user);

      return res.status(200).json({user: userDto, auth: true});

    }
      
}

module.exports = authController;