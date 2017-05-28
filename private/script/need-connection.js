module.exports = (req, res, next)=>{
    if(!req.session.user){
    	return res.status(403).json({
		    error: true,
		    errorInfos: "NOT AUTHORISED"
	    })
    }
    
    next();
};

