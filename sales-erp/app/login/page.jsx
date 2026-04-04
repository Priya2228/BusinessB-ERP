"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { buildApiUrl } from "../utils/api";
import styles from "./page.module.css";

export default function LoginPage() {
  // 1. State for form inputs
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/Dashboard");
    }
  }, [router]);

  // 2. Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 3. Handle Form Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(buildApiUrl("/api/login/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // 1. Save the secret token
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username); // Optional: to show "Welcome admin"
        
        // 2. ONLY navigate now that we have proof of login
        router.push("/Dashboard"); 
      } else {
        // Stay on page and show error if credentials fail
        setError(data.detail || "Invalid login name or password");
      }
    } catch (err) {
      setError("Server connection failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        {/* Left Side: Promo Panel (Keep your existing waves and glassmorphism) */}
        <div className={styles.promoPanel}>
          <div className={styles.promoGlowOne} />
          <div className={styles.promoGlowTwo} />
          <div className={`${styles.wave} ${styles.waveOne}`} />
          <div className={`${styles.wave} ${styles.waveTwo}`} />
          <div className={`${styles.wave} ${styles.waveThree}`} />

          <div className={styles.brandWrap}>
            <Image
              src="/majesticlogo.png"
              alt="Majestic"
              width={250}
              height={78}
              className={styles.logo}
              priority
            />
          </div>

          <h1 className={styles.heroTitle}>
            Smart and Scalable ERP
            <br />
            Solutions for SMEs.
          </h1>

          <div className={styles.deviceStage}>
            <div className={styles.desktopCard}>
              <div className={styles.desktopContent}>
                <div className={styles.desktopSidebar}>
                  <span className={styles.desktopSidebarDot} />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.desktopBody}>
                  <div className={styles.desktopHeroPanel} />
                  <div className={styles.desktopBottomCard} />
                </div>
              </div>
            </div>

            <div className={styles.phoneCard}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneHeader}>
                <div>
                  <span className={styles.phoneBrand}>Business i ERP</span>
                  <span className={styles.phoneWelcome}>Welcome Begumani.</span>
                </div>
                <span className={styles.phoneToggle} />
              </div>
              <div className={styles.phoneBody}>
                <div className={styles.phoneTopCards}>
                  <span />
                  <span />
                </div>
                <div className={styles.phoneServiceGrid}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.phoneBottomCards}>
                  <span />
                  <span />
                </div>
                <div className={styles.phoneActionBar} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.formBox}>
            <h2 className={styles.teamTitle}>Adhoc Demo Team</h2>
            <p className={styles.subtitle}>Login to your account</p>

            <form className={styles.form} onSubmit={handleLogin}>
              {error && <p className={styles.errorMessage}>{error}</p>}
              
              <label className={styles.fieldLabel}>Login Name</label>
              <input
                type="text"
                name="username"
                placeholder=""
                className={styles.input}
                value={formData.username}
                onChange={handleChange}
                required
              />

              <label className={styles.fieldLabel}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder=""
                  className={styles.input}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className={styles.metaRow}>
                <label className={styles.remember}>
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button type="button" className={styles.linkButton}>
                  Forgot password?
                </button>
              </div>

              <button 
                type="submit" 
                className={styles.loginButton} 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className={styles.spinner} size={18} /> : "LOGIN"}
              </button>
            </form>
          </div>

          <p className={styles.footer}>
            Copyright <span className={styles.copy}>©</span> 2026 Business i ERP, a
            product of <span className={styles.footerLink}>Adhoc Softwares</span>.
            All Rights Reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
