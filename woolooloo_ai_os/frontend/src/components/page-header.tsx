"use client";

import { GradientColor } from "@/lib/constants";

interface PageHeaderProps {
  title: string;
  icon: string;
  subtitle: string;
  gradient?: GradientColor;
  backgroundImage?: string;
}

export function PageHeader({
  title,
  icon,
  subtitle,
  gradient = "primary",
  backgroundImage = "/assets/img/bg.jpg",
}: PageHeaderProps) {
  return (
    <header className="header-2">
      <div className="page-header min-vh-50">
        <div className={`header-2 mask bg-gradient-${gradient}`} style={{ backgroundImage: `url("${backgroundImage}")` }}></div>
        <div className="container">
          <div className="row pt-lg-10 pt-md-6 pt-5">
            <div className="col-xl-5 col-lg-6 col-md-7">
              <div className="position-relative z-index-3">
                <h3 className="text-white font-weight-bolder">
                  <i className="material-symbols-rounded me-2">{icon}</i>
                  {title}
                </h3>
                <p className="text-white opacity-8">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
