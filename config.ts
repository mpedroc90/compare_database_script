import { DatabasesConfigurations, DATABASES } from "./types";


const config: DatabasesConfigurations = {
    [DATABASES.HEROKU_MASTER]: {

    connectionString: "",
    ssl:true
        
    }, 
    [DATABASES.HEROKU_PERSONAL]: {
        connectionString: "",
        ssl:true
    }, 
    [DATABASES.MASTER_LEGACY]: {
        connectionString: "",
        ssl:true
       
    }, 
    [DATABASES.PERSONAL_LEGACY]: {
        connectionString: "",
        ssl:true
    }
}


export default config;