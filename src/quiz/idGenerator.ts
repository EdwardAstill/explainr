export class IdGenerator {
  private questionCounter = 0;
  private infoCounter = 0;
  private sectionCounter = 0;
  private allIds = new Set<string>();

  private trackId(id: string) {
    if (this.allIds.has(id)) {
      throw new Error(`Duplicate quiz ID: "${id}". Each question must have a unique ID.`);
    }
    this.allIds.add(id);
  }

  nextQuestionId(existingId?: string): string {
    this.questionCounter++;
    const id = existingId || `q${this.questionCounter}`;
    this.trackId(id);
    return id;
  }

  nextInfoId(existingId?: string): string {
    this.infoCounter++;
    const id = existingId || `info-${this.infoCounter}`;
    this.trackId(id);
    return id;
  }

  nextSectionId(existingId?: string): string {
    this.sectionCounter++;
    const id = existingId || `sec-${this.sectionCounter}`;
    this.trackId(id);
    return id;
  }

  get currentQuestionNum(): number {
    return this.questionCounter;
  }

  assignGroupPartIds(parts: { id?: string }[], groupNum: number) {
    parts.forEach((part, i) => {
      if (part.id) this.allIds.delete(part.id);
      part.id = `q${groupNum}${String.fromCharCode(97 + i)}`;
      this.trackId(part.id);
    });
  }
}
