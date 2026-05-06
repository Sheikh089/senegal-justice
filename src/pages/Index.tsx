import { motion } from "framer-motion";
import { Shield, Scale, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import dashboardHero from "@/assets/dashboard-hero.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Banner */}
      <div className="w-full">
        <img
          src={dashboardHero}
          alt="Plateforme Judiciaire Unifiée — Portail d'accès national JusticeLink"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Main */}
      <main className="flex justify-center px-6 -mt-72 sm:-mt-96 md:-mt-[28rem] relative z-10 pb-12">
        <div className="max-w-3xl w-full">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Police Module */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                to="/police"
                className="stat-card flex flex-col items-center text-center p-8 group border-2 border-transparent hover:border-primary/20"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading font-bold text-lg text-foreground mb-2">Module Police</h2>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Enregistrement des plaintes, constitution des dossiers, ajout de preuves et transmission au tribunal.
                </p>
                <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                  Accéder <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </motion.div>

            {/* Tribunal Module */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                to="/tribunal"
                className="stat-card flex flex-col items-center text-center p-8 group border-2 border-transparent hover:border-accent/30"
              >
                <div className="h-16 w-16 rounded-2xl bg-accent/15 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                  <Scale className="h-8 w-8 text-accent-foreground" />
                </div>
                <h2 className="font-heading font-bold text-lg text-foreground mb-2">Module Tribunal</h2>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Réception des dossiers, attribution aux juges, planification des audiences et suivi des décisions.
                </p>
                <div className="flex items-center gap-2 text-accent-foreground text-sm font-medium group-hover:gap-3 transition-all">
                  Accéder <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Prototype · Données fictives · Version MVP
        </p>
      </footer>
    </div>
  );
};

export default Index;
