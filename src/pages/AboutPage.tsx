export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
        אודות
      </h1>

      <section className="space-y-3 text-base leading-relaxed">
        <p>
          <strong>אחד מאוזן</strong> הוא כלי מקוון ליצירה ופתרון של תשבצים בעברית.
          האתר מאפשר לכל אחד לבנות תשבץ מאפס — להזין הגדרות ותשובות, ליצור פריסת
          לוח אוטומטית, לסמן תאי רמז, ולשתף את התשבץ המוגמר עם חברים ומשפחה.
        </p>

        <p>
          התשבצים נכתבים בעברית מימין לשמאל, כמו שצריך. אפשר לפתור אותם ישירות
          בדפדפן בלי צורך בהתקנה או הרשמה — פשוט לפתוח את הקישור ולהתחיל לפתור.
        </p>

        <h2 className="text-xl font-semibold pt-2" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          איך זה עובד?
        </h2>
        <ul className="list-disc list-inside space-y-1 pr-2">
          <li>מזינים הגדרות ותשובות בעורך התשבצים</li>
          <li>המערכת מייצרת באופן אוטומטי פריסת לוח מותאמת</li>
          <li>אפשר לסמן תאים עם רמזים ולערוך את הלוח</li>
          <li>מפרסמים את התשבץ ומשתפים קישור לפתרון</li>
          <li>אפשר גם להדפיס את התשבץ לפתרון על נייר</li>
        </ul>

        <h2 className="text-xl font-semibold pt-2" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          מי מאחורי הפרויקט?
        </h2>
        <p>
          האתר פותח על ידי יונתן ממן ומוקדש באהבה לניסים ממן, שפתרון תשבצים וחיבור תשבצים הם המומחיות שלו.
          הפרויקט הוא קוד פתוח וזמין ב-GitHub.
        </p>

        <p>
          לשאלות, הצעות או דיווח על תקלות — ניתן לפנות דרך עמוד הפרויקט ב-GitHub.
        </p>
      </section>
    </div>
  )
}
