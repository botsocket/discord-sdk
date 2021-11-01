import { BotSocketClient } from "./client";
import Util from "util";

export class Logger {
    client: BotSocketClient;
    name: string;

    constructor(client: BotSocketClient, name: string) {
        this.client = client;
        this.name = name;
    }

    private inspect(data: any) {
        if (typeof data === "string") {
            return data;
        } else {
            return Util.inspect(data);
        }
    }

    private join(data: any[]) {
        return data.map(this.inspect).join(" ");
    }

    private log(type: string, message: any) {
        this.client.emit("log", {
            name: this.name,
            type,
            message: this.join(message),
        });
    }

    info(...data: any[]) {
        this.log("info", data);
    }
    error(...data: any[]) {
        this.log("error", data);
    }
    warn(...data: any[]) {
        this.log("warn", data);
    }
    debug(...data: any[]) {
        this.log("debug", data);
    }
}
