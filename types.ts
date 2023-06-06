import {ClientConfig} from 'pg'


export enum DATABASES {
    MASTER_LEGACY = "MASTER_LEGACY" , 
    PERSONAL_LEGACY = "PERSONAL_LEGACY" , 
    HEROKU_MASTER  = "HEROKU_MASTER", 
    HEROKU_PERSONAL = "HEROKU_PERSONAL",
}

export type DatabasesConfigurations = Record<DATABASES, ClientConfig>