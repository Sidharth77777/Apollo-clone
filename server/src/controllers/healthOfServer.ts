import type { Request, Response } from "express";

export const checkHealthOfServer = async(req:Request, res:Response) => {
    void req;
    res.status(200).json({
        success: true,
        message: "Server is OK and running..."
    })
}