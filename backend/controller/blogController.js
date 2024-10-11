const Joi = require('joi');
const fs = require('fs').promises;
const Blog = require('../models/blog');
const { BACKEND_SERVER_PATH } = require('../config/index');
const BlogDTO = require('../dto/blog');
const BlogDetailsDTO =require('../dto/blog-details');
const Comment= require('../models/comments');


const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
   
    async create(req, res, next) {
        // Check if request body is empty
        if (!req.body) {
            return next(new Error('Request body is empty'), null);
        }

        // Define the schema for the blog creation
        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            content: Joi.string().required(),
            photo: Joi.string().required()
        });

        // Validate the request body against the schema
        const { error } = createBlogSchema.validate(req.body);

        // If validation fails, return an error
        if (error) {
            return next(error, null);
        }

        // Extract the title, author, content, and photo from the request body
        const { title, author, content, photo } = req.body;

        // Convert the base64 encoded photo to a buffer
        const buffer = Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''), 'base64');

        // Generate a unique file name for the photo
        const imagePath = `${Date.now()}-${author}.png`;

        // Save the photo to the file system
        try {
            await fs.writeFile(`storage/${imagePath}`, buffer);
        } catch (error) {
            return next(error, null);
        }

        // Create a new blog instance
        let newBlog;

        try {
            newBlog = new Blog({
                title,
                author,
                content,
                photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
            });

            // Save the blog to the database
            await newBlog.save();
        } catch (error) {
            return next(error, null);
        }

        // Create a BlogDTO instance from the new blog
        const blogDto = new BlogDTO(newBlog);

        // Return the created blog in the response
        res.status(201).json({ blog: blogDto });
    },

    
    async getAll(req, res, next) {
        try{
            const blogs = await Blog.find({});
    
            let blogsDto = []; // Define the variable here
    
            for(let i=0 ;i<blogs.length; i++){
                const dto = new BlogDTO(blogs[i]);
                blogsDto.push(dto);
            }
    
            return res.status(200).json({blogs: blogsDto});
        }
        catch(error){
            return next(error);
        }
    },

    async getById(req, res, next) {
        // validate id
        // response 
        
        const getByIdSchema = Joi.object({
          id: Joi.string().regex(mongodbIdPattern).required()
        });
        const { error } = getByIdSchema.validate(req.params);
        
        if (error) {
          return next(error);
        }
        
        const { id } = req.params;
        let blog;
        
        try {
          
            blog = await Blog.findOne({_id: id}).populate('author'); // Use findById instead of find
          
          if (error) { // Check if blog is found
            return next(new Error('Blog not found'));
          }
          const blogDto = new BlogDetailsDTO(blog);
          return res.status(200).json({ blog: blogDto });


        } catch (error) {
          return next(error);
        }
      },
      async update(req, res, next) {
        //validate 
        const updateBlogSchema = Joi.object({
            title: Joi.string().required(),
            content: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            blogId: Joi.string().regex(mongodbIdPattern).required(),
            photo: Joi.string()
        });
    
        const { error } = updateBlogSchema.validate(req.body);
    
        const { title, content, author, blogId, photo } = req.body;
    
        let blog;
        try {
            blog = await Blog.findOne({ _id: blogId });
        } catch (error) {
            return next(error);
        }
    
        if (photo) {
            previousPhoto = blog.photoPath;
            previousPhoto = previousPhoto.split('/').at(-1);
    
            //delete photo
            fs.unlinkSync(`storage/${previousPhoto}`);
    
            // Convert the base64 encoded photo to a buffer
            const buffer = Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''), 'base64');
    
            // Generate a unique file name for the photo
            const imagePath = `${Date.now()}-${author}.png`;
    
            // Save the photo to the file system
            try {
                await fs.writeFile(`storage/${imagePath}`, buffer);
            } catch (error) {
                return next(error, null);
            }
    
            await Blog.updateOne({ _id: blogId }, { title, content, photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}` });
        } else {
            await Blog.updateOne({ _id: blogId }, { title, content });
        }
    
        return res.status(200).json({ message: 'blog updated!' });
    },
 
    async delete(req, res, next) {
        //validate id
        //delete blog
        //delete comments on that blog

        const deleteBlogSchema= Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });
        const{error} = deleteBlogSchema.validate(req.params);

        const{id} = req.params;
        //delete blog
        //delete comments
        try{
            await Blog.deleteOne({_id:id});
            await Comment.deleteMany({blog: id});

        }
        catch(error){
            return next(error);
        }

        return res.status(200).json({messege: ' blog deleted'});
    }
};

module.exports = blogController;