import { usePageTitle } from "@/hooks/usePageTitle"
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl"

export default function TermsPage() {
  usePageTitle("תנאי שימוש")
  useCanonicalUrl("/terms/")
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        תנאי שימוש
      </h1>

      <p className="text-sm text-muted-foreground">עדכון אחרון: מרץ 2026</p>

      <section className="space-y-4 text-base leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            1. כללי
          </h2>
          <p>
            השימוש באתר &quot;אחד מאוזן&quot; (להלן: &quot;האתר&quot;) כפוף לתנאי שימוש אלה.
            עצם השימוש באתר מהווה הסכמה לתנאים אלה. אם אינך מסכים לתנאים, אנא הימנע משימוש באתר.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            2. השירות
          </h2>
          <p>
            האתר מספק פלטפורמה ליצירה, עריכה, שיתוף ופתרון של תשבצים בעברית.
            השירות ניתן חינם ללא התחייבות לזמינות רציפה או לשמירת נתונים לטווח ארוך.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            3. תוכן משתמשים
          </h2>
          <p>
            המשתמשים אחראים לתוכן התשבצים שהם יוצרים ומפרסמים. אין ליצור תשבצים
            הכוללים תוכן פוגעני, מאיים, מטעה, או מפר זכויות יוצרים של צד שלישי.
          </p>
          <p>
            מפעיל האתר שומר לעצמו את הזכות להסיר תוכן שאינו עומד בתנאים אלה
            ללא הודעה מוקדמת.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            4. קניין רוחני
          </h2>
          <p>
            כל הזכויות באתר, לרבות עיצוב, קוד, וסימני מסחר, שמורות ליונתן ממן.
            התוכן שנוצר על ידי המשתמשים (תשבצים, הגדרות, תשובות) נשאר בבעלות יוצריו.
            קוד המקור של הפרויקט זמין ב-<a href="https://github.com/yonatanm/doublecross" target="_blank" rel="noopener noreferrer" className="text-[#C8963E] hover:underline">GitHub</a>{" "}
            והשימוש בו כפוף לתנאי רישיון MIT המפורטים שם.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            5. הגבלת אחריות
          </h2>
          <p>
            האתר מסופק &quot;כמות שהוא&quot; (AS IS) ללא אחריות מכל סוג. מפעיל האתר
            לא יישא באחריות לכל נזק ישיר או עקיף הנובע מהשימוש באתר, לרבות אובדן
            נתונים או הפסקת שירות.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            6. שינויים בתנאים
          </h2>
          <p>
            מפעיל האתר רשאי לעדכן תנאי שימוש אלה מעת לעת. המשך השימוש באתר
            לאחר עדכון התנאים מהווה הסכמה לתנאים המעודכנים.
          </p>
        </div>
      </section>
    </div>
  )
}
