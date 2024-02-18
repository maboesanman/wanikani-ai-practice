

export class MessageManager {
  constructor(defaultFactory = async () => [], timeout = 60 * 60 * 1000) {
    this.defaultFactory = defaultFactory;
    this.baseMessages = [];
    this.messages = [];
  }

  async #refresh() {
    const now = new Date();

    if(this.baseMessages.length === 0) {
      console.log("message history is empty");
    } else if(now - this.lastUpdated > this.timeout) {
      console.log("message history is stale");
    } else {
      return
    }

    this.baseMessages = await this.defaultFactory();
    this.messages = [];
    this.lastUpdated = now;
  }

  /**
   * @param {string} message 
   */
  async recordSystemMessage(message) {
    await this.#refresh();
    this.messages.push({ role: "system", content: message });
  }

  /**
   * @param {string} message 
   */
  async recordUserMessage(message) {
    await this.#refresh();
    this.messages.push({ role: "user", content: message });
  }

  /**
   * @param {string} message 
   */
  async recordAssistantMessage(message) {
    await this.#refresh();
    this.messages.push({ role: "assistant", content: message });
  }

  reset() {
    this.baseMessages = [];
    this.messages = [];
  }

  softReset() {
    this.messages = [];
  }

  async getMessages() {
    await this.#refresh();
    return [
      ...this.baseMessages,
      ...this.messages
    ];
  }
}
