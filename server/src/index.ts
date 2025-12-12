import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { ENV } from "./lib/ENV.js";
import { checkHealthOfServer } from "./controllers/healthOfServer.js";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { stripeWebhookHandler } from "./controllers/PaymentController.js";
import paymentsRouter from "./routes/PaymentRouter.js";
import companiesRouter from "./routes/CompanyRoutes.js";
import peopleRouter from "./routes/PersonRoutes.js";
import seedRouter from "./routes/SeedRoutes.js";
import listRouter from "./routes/ListRoutes.js";
import userRouter from "./routes/UserRoutes.js";
import analyticsRouter from "./routes/AnalyticsRoutes.js";

const app = express();

// middlewares
app.use(cors({
    origin: [
        "http://localhost:3000",
        ENV.FRONTEND_ORIGIN,
    ],
    credentials: true,
}));

app.use(cookieParser());

// Stripe webhook route before express.json middleware
app.post("/api/stripe/webhook", 
    express.raw({ type: "application/json" }),
    (req:Request, res:Response) => stripeWebhookHandler(req, res)
)

app.use(express.json());

const PORT: number = ENV.PORT || 5000;

// routes
// health check
app.get("/", checkHealthOfServer);

// user auth
app.use("/api/auth", userRouter)
app.use("/api/seed", seedRouter);

// analytics
app.use("/api/analytics", analyticsRouter);

// payments
app.use("/api/payments", paymentsRouter);

// protected routes
app.use("/api/companies", authMiddleware ,companiesRouter);
app.use("/api/people", authMiddleware , peopleRouter);
app.use("/api/lists", authMiddleware, listRouter);

// start server
const runServer = async() => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT} ...`)
        });

    } catch (err:any) {
        console.error("Error starting the server:", err.message);
        process.exit(1);
    }
}

runServer();