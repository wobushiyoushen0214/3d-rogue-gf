import { GameStateEnum } from "../../const/GameStateEnum";

export class GameStateInput {

    static gameState: GameStateEnum = GameStateEnum.Loading;

    static setGameState(state: GameStateEnum) {
        this.gameState = state;
    }

    static isLoading() {
        return this.gameState === GameStateEnum.Loading;
    }

    static isReady() {
        return this.gameState === GameStateEnum.Ready;
    }

    static isRunning() {
        return this.gameState === GameStateEnum.Running;
    }

    static isPaused() {
        return this.gameState === GameStateEnum.Paused;
    }

    static isGameOver() {
        return this.gameState === GameStateEnum.GameOver;
    }

    static isSelectingUpgrade() {
        return this.gameState === GameStateEnum.SelectingUpgrade;
    }

    static canUpdateWorld() {
        return this.isRunning();
    }
}
