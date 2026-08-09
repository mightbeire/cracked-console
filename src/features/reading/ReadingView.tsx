import { useEffect, useMemo, useState } from "react";
import { getReadingLibrary, saveReadingReport, setReadingStatus } from "../../data/readingRepository";
import { readingReportComplete } from "../../engine/domain/reading/rules";
import type {
  ReadingBook,
  ReadingLibrary,
  ReadingMonth,
  ReadingReportDraft,
  ReadingStatus,
} from "../../engine/domain/reading/types";

const emptyLibrary: ReadingLibrary = { months: [], bonusBooks: [] };

function reportFromBook(book: ReadingBook): ReadingReportDraft {
  return {
    recall: book.report.recall,
    coreIdea: book.report.coreIdea,
    bespokeResponse: book.report.bespokeResponse,
    evidenceNotes: book.report.evidenceNotes,
    pushBack: book.report.pushBack,
    connection: book.report.connection,
    keepOne: book.report.keepOne,
  };
}

function statusLabel(status: ReadingStatus): string {
  return status.replaceAll("_", " ");
}

function ReadingBookDetail({ book, onReload }: { book: ReadingBook; onReload: () => Promise<void> }) {
  const [report, setReport] = useState<ReadingReportDraft>(() => reportFromBook(book));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setReport(reportFromBook(book));
    setMessage("");
  }, [book]);

  function setField<K extends keyof ReadingReportDraft>(key: K, value: ReadingReportDraft[K]) {
    setReport((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await saveReadingReport(book.id, report);
      setMessage("Reading Brief saved.");
      await onReload();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: ReadingStatus) {
    setBusy(true);
    setMessage("");
    try {
      await setReadingStatus(book.id, book.status, next, report);
      await onReload();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const complete = readingReportComplete(report);

  return (
    <section className="reading-book-detail">
      <header className="reading-book-header">
        <div>
          <p className="section-kicker">
            {book.isBonus ? "BONUS REREAD" : book.isShort ? "SHORT READ" : "MANDATORY"}
          </p>
          <h2>{book.title}</h2>
          <p>{book.author}</p>
        </div>
        <div className="reading-status">{statusLabel(book.status)}</div>
      </header>

      <section className="book-assignment">
        <p className="section-kicker">BESPOKE CHALLENGE</p>
        <p>{book.bespokeAssignment}</p>
      </section>

      <section className="reading-backbone">
        <div className="section-heading">
          <div>
            <p className="section-kicker">READING BRIEF</p>
            <h3>Your thinking, not a generic summary</h3>
          </div>
          <span>{complete ? "7/7" : "IN PROGRESS"}</span>
        </div>

        <label>
          <span className="field-label">1. Recall from memory</span>
          <textarea className="text-area reading-area" value={report.recall} onChange={(event) => setField("recall", event.target.value)} />
        </label>
        <label>
          <span className="field-label">2. Core argument, question, or conflict</span>
          <textarea className="text-area reading-area" value={report.coreIdea} onChange={(event) => setField("coreIdea", event.target.value)} />
        </label>
        <label>
          <span className="field-label">3. Bespoke challenge response</span>
          <textarea className="text-area reading-area reading-area-large" value={report.bespokeResponse} onChange={(event) => setField("bespokeResponse", event.target.value)} />
        </label>
        <label>
          <span className="field-label">4. Evidence / scenes / arguments / page references</span>
          <textarea className="text-area reading-area" value={report.evidenceNotes} onChange={(event) => setField("evidenceNotes", event.target.value)} />
        </label>
        <label>
          <span className="field-label">5. Push back: what do you doubt, reject, or interpret differently?</span>
          <textarea className="text-area reading-area" value={report.pushBack} onChange={(event) => setField("pushBack", event.target.value)} />
        </label>
        <label>
          <span className="field-label">6. Connection to another idea, book, skill, event, or project</span>
          <textarea className="text-area reading-area" value={report.connection} onChange={(event) => setField("connection", event.target.value)} />
        </label>
        <label>
          <span className="field-label">7. One idea worth remembering in a year</span>
          <textarea className="text-area reading-area" value={report.keepOne} onChange={(event) => setField("keepOne", event.target.value)} />
        </label>

        {message ? <p className="form-message">{message}</p> : null}

        <div className="reading-actions">
          <button className="secondary-button" disabled={busy} onClick={() => void save()} type="button">Save brief</button>
          {book.status === "NOT_STARTED" ? (
            <button className="primary-button" disabled={busy} onClick={() => void changeStatus("READING")} type="button">Start reading</button>
          ) : null}
          {book.status === "READING" ? (
            <button className="primary-button" disabled={busy} onClick={() => void changeStatus("REPORT_DUE")} type="button">Finished reading / report due</button>
          ) : null}
          {book.status === "REPORT_DUE" ? (
            <button className="primary-button" disabled={busy || !complete} onClick={() => void changeStatus("COMPLETE")} type="button">Complete book</button>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function MonthIndex({ months, selectedId, onSelect }: {
  months: ReadingMonth[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="reading-month-list">
      {months.map((month) => {
        const complete = month.books.filter((book) => book.status === "COMPLETE").length;
        return (
          <button
            className={`reading-month-item ${selectedId === month.id ? "reading-month-item-active" : ""}`}
            key={month.id}
            onClick={() => onSelect(month.id)}
            type="button"
          >
            <span className="row-meta">MONTH {String(month.id).padStart(2, "0")}</span>
            <strong>{month.title}</strong>
            <small>{complete}/{month.requiredCount} mandatory complete</small>
          </button>
        );
      })}
    </div>
  );
}

export function ReadingView() {
  const [library, setLibrary] = useState<ReadingLibrary>(emptyLibrary);
  const [monthId, setMonthId] = useState(1);
  const [bookId, setBookId] = useState<number | null>(null);
  const [showBonus, setShowBonus] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const next = await getReadingLibrary();
      setLibrary(next);
      setError("");
      if (bookId === null) {
        const first = next.months.find((month) => month.id === monthId)?.books[0];
        if (first) setBookId(first.id);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedMonth = library.months.find((month) => month.id === monthId);
  const books = showBonus ? library.bonusBooks : selectedMonth?.books ?? [];
  const selectedBook = books.find((book) => book.id === bookId) ?? books[0];

  const requiredBooks = useMemo(
    () => library.months.flatMap((month) => month.books).filter((book) => !book.isBonus),
    [library],
  );
  const totalComplete = requiredBooks.filter((book) => book.status === "COMPLETE").length;
  const totalRequired = requiredBooks.length;

  function selectMonth(id: number) {
    setShowBonus(false);
    setMonthId(id);
    const first = library.months.find((month) => month.id === id)?.books[0];
    setBookId(first?.id ?? null);
  }

  function selectBonus() {
    setShowBonus(true);
    setBookId(library.bonusBooks[0]?.id ?? null);
  }

  return (
    <div className="reading-page">
      <header className="page-header">
        <p className="eyebrow">USER-CONFIGURED READING</p>
        <h1>Reading</h1>
        <p className="page-summary">
          The imported plan defines the reading schedule. Finishing pages is not enough; every completed book needs the full Reading Brief.
        </p>
        <div className="reading-overview">
          <span>{totalComplete}/{totalRequired} required complete</span>
          <span>Bonus items do not count toward required completion</span>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="reading-layout">
        <aside className="reading-index">
          <MonthIndex months={library.months} selectedId={monthId} onSelect={selectMonth} />
          <button className={`reading-month-item ${showBonus ? "reading-month-item-active" : ""}`} onClick={selectBonus} type="button">
            <span className="row-meta">BONUS</span>
            <strong>Rereads</strong>
            <small>Optional / no quota pressure</small>
          </button>
        </aside>

        <div className="reading-workspace">
          {!showBonus && selectedMonth ? (
            <div className="reading-month-header">
              <div>
                <p className="section-kicker">MONTH {String(selectedMonth.id).padStart(2, "0")}</p>
                <h2>{selectedMonth.title}</h2>
                <small>{selectedMonth.startDate} to {selectedMonth.endDate}</small>
              </div>
              <span>{selectedMonth.requiredCount} mandatory</span>
            </div>
          ) : null}

          <div className="reading-book-tabs">
            {books.map((book) => (
              <button
                className={`reading-book-tab ${selectedBook?.id === book.id ? "reading-book-tab-active" : ""}`}
                key={book.id}
                onClick={() => setBookId(book.id)}
                type="button"
              >
                <strong>{book.title}</strong>
                <small>{statusLabel(book.status)}</small>
              </button>
            ))}
          </div>

          {selectedBook ? <ReadingBookDetail book={selectedBook} key={selectedBook.id} onReload={load} /> : null}
        </div>
      </div>
    </div>
  );
}
