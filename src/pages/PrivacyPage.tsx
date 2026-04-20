import { usePageTitle } from "@/hooks/usePageTitle"
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl"

export default function PrivacyPage() {
  usePageTitle("פרטיות")
  useCanonicalUrl("/privacy/")
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        מדיניות פרטיות
      </h1>

      <p className="text-sm text-muted-foreground">עדכון אחרון: מרץ 2026</p>

      <section className="space-y-4 text-base leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            1. מידע שאנחנו אוספים
          </h2>
          <p>
            בעת התחברות באמצעות חשבון Google, אנו מקבלים את הפרטים הבאים:
            שם מלא, כתובת דוא&quot;ל, ותמונת פרופיל. מידע זה משמש לזיהוי
            המשתמש ולשיוך התשבצים שיצר.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            2. כיצד אנו משתמשים במידע
          </h2>
          <ul className="list-disc list-inside space-y-1 pr-2">
            <li>הצגת שם ותמונת המשתמש בממשק האתר</li>
            <li>שיוך תשבצים ליוצר שלהם</li>
            <li>אין שימוש במידע למטרות שיווק או פרסום</li>
            <li>המידע אינו נמכר או מועבר לצדדים שלישיים</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            3. אחסון מידע
          </h2>
          <p>
            הנתונים מאוחסנים בשירות Firebase של Google. התשבצים ופרטי המשתמש
            נשמרים במסד נתונים מאובטח בענן. תשבצים שפורסמו נגישים לכל מי שיש
            לו את הקישור.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            4. אחסון מקומי
          </h2>
          <p>
            בעת פתרון תשבץ, התקדמות הפתרון נשמרת בדפדפן שלך (localStorage)
            כדי שתוכלו לחזור ולהמשיך מאוחר יותר. מידע זה נשמר רק במכשיר שלך
            ואינו נשלח לשרת.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            5. עוגיות (Cookies)
          </h2>
          <p>
            האתר משתמש בעוגיות טכניות הנדרשות לתפעול שירות ההתחברות של Firebase.
            אין שימוש בעוגיות מעקב או פרסום.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            6. מחיקת מידע
          </h2>
          <p>
            לבקשת מחיקת תשבצים או מחיקת חשבון מלאה, ניתן לפנות אלינו דרך{" "}
            <a href="https://github.com/yonatanm/doublecross/issues" target="_blank" rel="noopener noreferrer" className="text-[#C8963E] hover:underline">עמוד הפרויקט ב-GitHub</a>.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            7. יצירת קשר
          </h2>
          <p>
            לשאלות בנושא פרטיות, ניתן לפנות דרך{" "}
            <a href="https://github.com/yonatanm/doublecross/issues" target="_blank" rel="noopener noreferrer" className="text-[#C8963E] hover:underline">עמוד הפרויקט ב-GitHub</a>.
          </p>
        </div>
      </section>
    </div>
  )
}
