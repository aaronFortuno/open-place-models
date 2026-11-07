import {prepareGalleryCatalogue} from './scripts/gallery-catalogue.mjs';

export default {
  base:'./',publicDir:false,
  plugins:[{
    name:'gallery-catalogue',
    configureServer(server){
      server.middlewares.use(async (request,response,next)=>{
        if(request.url?.split('?')[0]!=='/catalog.geojson')return next();
        try{
          const {index}=await prepareGalleryCatalogue();
          response.setHeader('Content-Type','application/geo+json; charset=utf-8');
          response.end(index);
        }catch(error){
          next(error);
        }
      });
    },
  }],
};
