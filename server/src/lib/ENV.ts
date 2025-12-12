import dotenv from "dotenv";
dotenv.config({quiet:true})

export const ENV = {
    PORT: Number(process.env.PORT),
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN as string,
    APP_NAME: process.env.APP_NAME as string,

    MONGODB_URI: process.env.MONGODB_URI as string,

    SEED_SECRET: process.env.SEED_SECRET as string,

    JWT_SECRET: process.env.JWT_SECRET as string,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY as string,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    CREDIT_PRICE_CENTS: Number(process.env.CREDIT_PRICE_CENTS),

}