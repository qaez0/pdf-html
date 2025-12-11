import { useCallback, useState } from "react";
import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgenjs";
import html2canvas from "html2canvas";
import "./App.css";

function App() {
  const [exportingType, setExportingType] = useState<"pdf" | "ppt" | null>(
    null
  );
  const isExporting = exportingType !== null;

  const exportToPdf = useCallback(async () => {
    if (isExporting) return;
    setExportingType("pdf");

    try {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>(".page section")
      );

      if (!sections.length) {
        alert("No content found to export.");
        return;
      }

      await document.fonts.ready;

      const prepareImage = (img: HTMLImageElement) =>
        new Promise<void>((resolve) => {
          if (img.src.startsWith("http")) {
            img.setAttribute("crossorigin", "anonymous");
            img.setAttribute("referrerpolicy", "no-referrer");
          }

          if (img.complete && img.naturalWidth !== 0) {
            resolve();
            return;
          }

          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };

          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });

      await Promise.all(Array.from(document.images).map(prepareImage));

      // Custom page size: 20in x 11.25in landscape (keeps 16:9-ish ratio)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [20, 11.25],
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Capture without any printer-like margin so the PDF is borderless
      const margin = 0;

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const sectionWidth = section.scrollWidth || section.offsetWidth || 1600;
        const sectionHeight =
          section.scrollHeight || section.offsetHeight || 900;
        const maxDim = Math.max(sectionWidth, sectionHeight);
        const scale = Math.min(2, 1600 / maxDim); // scale down huge nodes to avoid distortions

        const canvas = await html2canvas(section, {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: sectionWidth,
          height: sectionHeight,
          windowWidth: sectionWidth,
          windowHeight: sectionHeight,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(
          (pageWidth - margin * 2) / imgWidth,
          (pageHeight - margin * 2) / imgHeight
        );
        const pdfWidth = imgWidth * ratio;
        const pdfHeight = imgHeight * ratio;
        // place the image flush to the page edges for a borderless result
        const x = margin;
        const y = margin;

        if (i !== 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", x, y, pdfWidth, pdfHeight);
      }

      pdf.save("presentation.pdf");
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Unable to export PDF. Please check console for details.");
    } finally {
      setExportingType(null);
    }
  }, [isExporting]);

  const exportToPpt = useCallback(async () => {
    if (isExporting) return;
    setExportingType("ppt");

    try {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>(".page section")
      );

      if (!sections.length) {
        alert("No content found to export.");
        return;
      }

      await document.fonts.ready;

      const prepareImage = (img: HTMLImageElement) =>
        new Promise<void>((resolve) => {
          if (img.src.startsWith("http")) {
            img.setAttribute("crossorigin", "anonymous");
            img.setAttribute("referrerpolicy", "no-referrer");
          }

          if (img.complete && img.naturalWidth !== 0) {
            resolve();
            return;
          }

          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };

          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });

      await Promise.all(Array.from(document.images).map(prepareImage));

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      const slideWidth = 10; // default 16:9 width in inches
      const slideHeight = 5.625; // default 16:9 height in inches
      const pxToIn = (px: number) => px / 96; // browser pixels to inches

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const sectionWidth = section.scrollWidth || section.offsetWidth || 1600;
        const sectionHeight =
          section.scrollHeight || section.offsetHeight || 900;
        const maxDim = Math.max(sectionWidth, sectionHeight);
        const scale = Math.min(2, 1600 / maxDim);

        const canvas = await html2canvas(section, {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: sectionWidth,
          height: sectionHeight,
          windowWidth: sectionWidth,
          windowHeight: sectionHeight,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidthIn = pxToIn(canvas.width);
        const imgHeightIn = pxToIn(canvas.height);
        const ratio = Math.min(
          slideWidth / imgWidthIn,
          slideHeight / imgHeightIn
        );
        const w = imgWidthIn * ratio;
        const h = imgHeightIn * ratio;
        const x = (slideWidth - w) / 2;
        const y = (slideHeight - h) / 2;

        const slide = pptx.addSlide();
        slide.addImage({
          data: imgData,
          x,
          y,
          w,
          h,
        });
      }

      await pptx.writeFile({ fileName: "presentation.pptx" });
    } catch (err) {
      console.error("PPT export failed", err);
      alert("Unable to export PPT. Please check console for details.");
    } finally {
      setExportingType(null);
    }
  }, [isExporting]);
  return (
    <div className="page">
      <div
        className="export-actions"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          display: "flex",
          gap: "10px",
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          className="export-btn"
          onClick={exportToPdf}
          disabled={isExporting}
        >
          {exportingType === "pdf" ? "Exporting…" : "Export PDF"}
        </button>
        <button
          type="button"
          className="export-btn"
          onClick={exportToPpt}
          disabled={isExporting}
        >
          {exportingType === "ppt" ? "Exporting…" : "Export PPT"}
        </button>
      </div>
      <section className="hero">
        <div className="hero-left">
          <img
            src="https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1400&q=80"
            alt="Modern building"
          />
          <div className="hero-overlay" />
          <div
            className="brand"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <div className="brand-name" onClick={exportToPdf}>
              Empire Solutions
            </div>
          </div>
        </div>
        <div className="hero-content">
          <h1>商业计划书</h1>
          <div className="hero-stripes" aria-hidden>
            {Array.from({ length: 9 }).map((_, idx) => (
              <span key={idx} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="toc"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 0",
          gap: "100px",
        }}
      >
        <div className="toc-left">
          <h2>目录</h2>
          <img
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80"
            alt="Building"
            crossOrigin="anonymous"
          />
        </div>
        <div className="toc-list">
          {[
            "引言",
            "商业模式",
            "市场分析",
            "后端系统",
            "团队介绍",
            "合作方案选项",
            "结论",
          ].map((item) => (
            <div key={item} className="toc-item">
              <span className="dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="hero-stripes" aria-hidden>
          {Array.from({ length: 9 }).map((_, idx) => (
            <span key={idx} style={{ background: "#FFFFFF80" }} />
          ))}
        </div>
      </section>

      <section className="introduction">
        <h2>引言</h2>
        <p>
          欢迎阅览本合作方案。凭借逾十年的行业经验，Empire
          始终致力于为有意布局博彩行业的合作伙伴提供稳定高效的系统解决方案及全方位的运营支持。本文件不仅是一份合作提案，更是诚挚邀请贵方与我们携手共进、共创双赢的机会。依托我们在行业内积累的专业能力与实践经验，Empire
          期望成为贵方在博彩领域值得信赖的长期合作伙伴，与贵方共同开拓市场、共襄成功。
        </p>
        <div className="intro-city">
          <img
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80"
            alt="City skyline"
            crossOrigin="anonymous"
          />
        </div>
      </section>

      <section className="status">
        <div className="status-left">
          <h2>当前现状</h2>
          <p>
            随着数字化趋势的不断加深及全球互联网普及率的持续提升，在线博彩行业呈现稳步增长态势，尤其是在移动终端使用不断增加的推动下，行业发展动力更为强劲。虚拟现实（VR）、人工智能（AI）等创新技术的运用，正在显著提升玩家的互动体验与沉浸感。
            当前行业重点围绕实时互动、个性化服务及合规运营等方面持续升级与优化，通过强化风控与合规管理，推动业务在稳健基础上的长期可持续发展。
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {[
            [
              "持续增长",
              "线上博彩行业在持续的数字化趋势和全球互联网可及性不断提升的推动下蓬勃发展，并吸引着数量不断增长的玩家群体参与。",
              "📈",
            ],
            [
              "移动端主导",
              "智能手机的便捷性使大量博彩行为 加速向移动端迁移，玩家可随时随地便捷参与相关博彩活动。",
              "📱",
            ],
            [
              "多元化产品与服务",
              "线上博彩平台可提供多元化的产品与服务，涵盖体育博彩、真人及电子赌场游戏、电竞竞猜等多个品类， 充分满足不同玩家的兴趣偏好与需求。",
              "📊",
            ],
          ].map(([title, desc, icon]) => (
            <div key={title} className="status-card">
              <div className="status-icon-circle" aria-hidden>
                {icon}
              </div>
              <div className="status-copy">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="business-model">
        <h2>商业模式类型</h2>
        <div className="model-canvas">
          <div className="callout callout-tl">
            <h3>定制化设计:</h3>
            <p>
              根据贵方的实际需求，我们提供
              专业的网站设计服务，助力贵方网站脱颖而出，彰显独特品牌形象。
            </p>
          </div>
          <div className="callout callout-tr">
            <h3>便捷易用的后台管理系统：</h3>
            <p>
              我们的一站式解决方案配备 直观且易于操作的后台管理系统， 使贵方能够
              轻松便捷地更新与管理网站内容。
            </p>
          </div>
          <div className="callout callout-bl">
            <h3>安全保障措施：</h3>
            <p>
              我们实施严格的安全防护措施， 有效保护贵方网站免受潜在威胁与风险。
            </p>
          </div>
          <div className="callout callout-br">
            <h3>响应式设计：</h3>
            <p>
              我们的网站设计采用响应式布局， 确保在各类终端设备上
              均可为用户提供优质的浏览体验。
            </p>
          </div>

          <div className="diamond-cluster">
            <div className="diamond-card central">
              <div className="icon">🖌️</div>
            </div>
            <div className="diamond-card central">
              <div className="icon">🖥️</div>
            </div>
            <div className="diamond-card central">
              <div className="icon">🛡️</div>
            </div>
            <div className="diamond-card central">
              <div className="icon">💳</div>
            </div>
          </div>
        </div>
      </section>

      <section className="market">
        <h2 className="market-title">市场分析</h2>

        <div className="market-grid">
          <div className="market-card">
            <div className="market-card-top">
              <h3>目标用户</h3>
            </div>
            <div className="market-card-body">
              <p>
                我们主要面向寻求线上博彩娱乐的印度成年用户，尤其是那些
                对数字技术使用较为熟悉，且积极寻找创新型娱乐方式的目标群体。
              </p>
            </div>
          </div>

          <div className="market-card">
            <div className="market-card-top">
              <h3>地域重点</h3>
            </div>
            <div className="market-card-body">
              <p>
                我们的核心市场布局覆盖整个印度，重点聚焦于孟买、德里、班加罗尔等一线及主要城市的核心人群。同时通过多渠道拓展，实现更广泛的覆盖，触达不同层级与地区的用户。
              </p>
            </div>
          </div>

          <div className="market-card">
            <div className="market-card-top">
              <h3>竞争格局</h3>
            </div>
            <div className="market-card-body">
              <p>
                在竞争激烈的印度线上博彩市场中，我们既面临具备品牌知名度和用户基础的成熟平台，
                也将面对不断涌现的新兴竞争者。
                我们将通过持续创新、强化安全保障以及优化整体用户体验，
                提供更具竞争力的产品与服务，
                从而在细分市场中脱颖而出，提升综合竞争优势.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="backend">
        <div className="backend-hex-stack">
          <div className="hex-layer hex-layer-lg" />
          <div className="hex-layer hex-layer-md" />
          <div className="hex-layer hex-layer-img">
            <img
              src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
              alt="Tech background"
              crossOrigin="anonymous"
            />
          </div>
          <div className="hex-icon">
            <span role="img" aria-label="tools">
              🛠️
            </span>
          </div>
        </div>

        <div className="backend-content">
          <p className="eyebrow">我司后端系统</p>
          <h2>后端系统</h2>
          <p className="lead backend-lead" style={{ textAlign: "right" }}>
            我们的系统已在行业内稳定运行十年，其中在印度市场成功运营三年。丰富的实践经验使我们的系统日趋成熟，能够稳健地支撑并满足印度市场的多元化需求。
          </p>

          <div className="backend-grid">
            {[
              [
                "营销推广系统",
                "我们的系统专为印度市场的营销推广需求量身定制，提供包括首存优惠、复存奖励等多样化的促销功能。所有促销活动均可通过我们便捷易用的后台管理系统轻松配置与灵活调整。",
              ],
              [
                "裂变推广机制",
                "我们的系统支持裂变推广机制，使现有用户能够便捷地引入新用户，从而实现用户群体的快速、自然增长。系统提供的便捷工具使激励方案的设置与管理更加高效顺畅。",
              ],
              [
                "代理联盟系统",
                "我们的代理联盟后台系统提供强大的数据追踪工具、实时报表功能，以及先进的安全防护措施，确保业务运营的安全性与高效性。",
              ],
              [
                "财务结算系统",
                "我们经过三年精心打磨的财务结算系统专为印度市场量身定制。凭借快速的资金交易处理能力，不仅提升了用户体验，更显著增强了财务运营的整体效率。",
              ],
            ].map(([title, desc], index) => (
              <div key={title} className="backend-card">
                <div className="backend-number">{index + 1}</div>
                <div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="team">
        <div className="team-inner">
          <div className="team-header">
            <div className="icon-bulb">💡</div>
            <div>
              <h2>团队介绍</h2>
              <p>
                专业的团队配置确保为网站的发展与维护提供最快速、最高效的支持与保障服务
              </p>
            </div>
          </div>
          <div className="team-grid">
            {[
              [
                "客户服务团队",
                "专业的客户服务团队提供全方位的支持服务，负责处理客户咨询、跟进订单进度，并通过高效的沟通与快速响应的解决方案，确保客户满意度与服务质量。",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=240&q=80",
              ],
              [
                "电话营销团队",
                "电话营销团队通过电话方式进行产品推广与销售，拓展客户群体；同时，电话客服团队负责提供售前与售后支持，处理订单、解答客户咨询，提升客户满意度，上述工作均通过电话沟通高效完成。",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
              ],
              [
                "风控管理团队",
                "风控管理团队通过反欺诈监测、账户核验和支付安全管控等措施，确保平台公平性、用户资金与信息安全以及合规运营。团队能够对各类突发事件进行快速响应与处置，从而保障平台的持续稳定运行。",
                "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=240&q=80",
              ],
              [
                "财务团队",
                "我们拥有具备三年行业经验的专业财务团队，熟悉银行相关风险的识别与应对机制，可高效处理用户的充值与提现需求，确保资金流转快速、安全、顺畅。",
                "https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=240&q=80",
              ],
            ].map(([title, desc, img]) => (
              <div key={title} className="team-card">
                <div className="team-avatar">
                  <img
                    src={img as string}
                    alt={title as string}
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="team-copy">
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="options">
        <div className="options-inner">
          <div className="options-grid">
            <div className="option-card option-affiliate">
              <h2
                style={{
                  color: "#FFFFFF",
                }}
              >
                方案一：成为我们的代理联盟伙伴
              </h2>
              <div className="option-affiliate-body">
                <div className="option-table">
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            体育投注、真人娱乐场、Rummy、彩票及老虎机总净收益
                          </th>
                          <th>佣金比例</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["NT$ 1- 200,000", "25%"],
                          ["NT$ 2,000,001 - 3,000,000", "35%"],
                          ["NT$ 3,000,001 - 5,000,000", "45%"],
                          ["NT$ 5,000,001 - 30,000,000", "55%"],
                          ["NT$ 30,000,001 - 60,000,000", "60%"],
                          ["NT$ 60,000,001 - 100,000,000", "70%"],
                          ["> NT$ 100,000,001", "80%"],
                        ].map(([range, rate]) => (
                          <tr key={range}>
                            <td>{range}</td>
                            <td>{rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="option-affiliate-text">
                  <p>
                    成为代理对于合作方具有显著优势，得益于成熟运营团队的全程支持以及已有品牌影响力的背书。代理方可将精力主要聚焦于市场推广与用户拓展，由我们专业团队负责
                    线下用户获客及相关服务支持，
                    从而共同为终端用户提供优质的使用体验。
                  </p>
                  <div className="option-note">
                    体育博彩＋娱乐场游戏＋老虎机＋ 所产生的总毛收益 − 玩家红利 −
                    15% 管理成本 = 净收益 1 净收益 1 × 佣金比例 = 佣金 1 (a)
                    代理方负责邀请并引导玩家加入 11ic 平台； (b)
                    代理方可根据其名下玩家的整体业绩表现，获得最高可达 60%
                    的佣金分成。 佣金结算将综合考虑上述各项指标， 且需至少保持 3
                    名活跃玩家方可达成基础结算条件。
                  </div>
                </div>
              </div>
            </div>

            <div className="option-card option-brand">
              <h2>方案二：打造您的专属品牌</h2>
              <div className="table-wrapper">
                <table>
                  <tbody>
                    {[
                      [
                        "白标产品",
                        "网页端、H5、原生 App（iOS、Android）后台管理系统、代理联盟系统",
                      ],
                      ["搭建费用", "NT$7,000"],
                      ["界面设计费", "NT$3,000"],
                      ["白标服务费", "NT$7,000 per month"],
                      ["游戏平台第三方费用", "按玩家净亏损的 15% 收取"],
                      ["客户服务", "提供 7×24 小时在线客服支持"],
                      [
                        "风控服务",
                        "对会员日常违规行为及异常活动进行审查与监控。",
                      ],
                      ["财务服务", "对充值与提现交易统一收取 3.5% 手续费。"],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="option-text">
                打造自有品牌的线上博彩平台，是在高度竞争市场中实现差异化定位的战略性选择。
                通过塑造独特的品牌形象，我们可以在用户心中建立更深层次的信任与良好口碑，
                为玩家提供更加个性化且高品质的娱乐体验。
                与此同时，对业务运营与用户互动实现全方位掌控，并结合灵活的盈利模式与定制化功能，
                有助于更好地满足多样化的市场需求，从而推动平台取得长期、可持续的市场成功。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="conclusion">
        <div className="conclusion-content">
          <h2>结论</h2>
          <p>
            现在正是为进入印度市场打下基础的有利时机。随着印度超级联赛（IPL）将于三月开赛，这一重要赛事为我们提供了极佳的切入窗口。在当今互联网时代，越来越多的用户倾向于通过线上渠道参与博彩活动，而
            IPL 的举办也为我们触达更大规模的目标人群创造了重要机会。
            随着网站用户规模的不断积累与扩大，平台将具备可观的创收潜力。我们期望，借助我方在行业内的经验与专业服务，结合贵方在印度本地的资源与渠道优势，能够共同助力贵方项目在印度市场取得成功与长远发展。
          </p>
        </div>
        <div className="conclusion-image">
          <img
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80"
            alt="Team working"
          />
        </div>
      </section>

      <section className="summary-table">
        <div className="table-card">
          <div className="table-wrapper wide">
            <table>
              <thead>
                <tr>
                  {[
                    "月份",
                    "首存人数（FTD）",
                    "单个首存成本",
                    "首存总成本",
                    "活跃玩家数",
                    "人均存款额",
                    "人均 GGR（毛博彩收入）",
                    "活跃玩家总存款额",
                    "财务成本",
                    "总成本",
                    "总利润",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "2023 年 12 月",
                    "2,500",
                    "20",
                    "50,000",
                    "125",
                    "20",
                    "5",
                    "5,000.00",
                    "350.00",
                    "50,350.00",
                    "-45,350.00",
                  ],
                  [
                    "1 月",
                    "5,000",
                    "10",
                    "50,000",
                    "375",
                    "25",
                    "6",
                    "15,000.00",
                    "1,050.00",
                    "51,050.00",
                    "-36,050.00",
                  ],
                  [
                    "2 月",
                    "10,000",
                    "5",
                    "50,000",
                    "875",
                    "30",
                    "8",
                    "35,000.00",
                    "2,450.00",
                    "52,450.00",
                    "-17,450.00",
                  ],
                  [
                    "3 月",
                    "10,000",
                    "5",
                    "50,000",
                    "1,375",
                    "35",
                    "9",
                    "55,000.00",
                    "3,850.00",
                    "53,850.00",
                    "1,150.00",
                  ],
                  [
                    "4 月",
                    "10,000",
                    "5",
                    "50,000",
                    "1,875",
                    "40",
                    "10",
                    "75,000.00",
                    "5,250.00",
                    "55,250.00",
                    "19,750.00",
                  ],
                  [
                    "5 月",
                    "10,000",
                    "5",
                    "50,000",
                    "2,375",
                    "40",
                    "10",
                    "95,000.00",
                    "6,650.00",
                    "56,650.00",
                    "38,350.00",
                  ],
                  [
                    "6 月",
                    "10,000",
                    "5",
                    "50,000",
                    "2,875",
                    "40",
                    "10",
                    "115,000.00",
                    "8,050.00",
                    "58,050.00",
                    "56,950.00",
                  ],
                  [
                    "7 月",
                    "10,000",
                    "5",
                    "50,000",
                    "3,375",
                    "60",
                    "15",
                    "135,000.00",
                    "9,450.00",
                    "59,450.00",
                    "75,550.00",
                  ],
                  [
                    "8 月",
                    "10,000",
                    "5",
                    "50,000",
                    "3,875",
                    "60",
                    "15",
                    "155,000.00",
                    "10,850.00",
                    "60,850.00",
                    "94,150.00",
                  ],
                  [
                    "9 月",
                    "10,000",
                    "5",
                    "50,000",
                    "4,375",
                    "60",
                    "15",
                    "175,000.00",
                    "12,250.00",
                    "62,250.00",
                    "112,750.00",
                  ],
                  [
                    "10 月",
                    "10,000",
                    "5",
                    "50,000",
                    "4,875",
                    "70",
                    "18",
                    "195,000.00",
                    "13,650.00",
                    "63,650.00",
                    "131,350.00",
                  ],
                  [
                    "11 月",
                    "10,000",
                    "5",
                    "50,000",
                    "5,375",
                    "70",
                    "18",
                    "215,000.00",
                    "15,050.00",
                    "65,050.00",
                    "149,950.00",
                  ],
                  [
                    "12 月",
                    "10,000",
                    "5",
                    "50,000",
                    "5,875",
                    "70",
                    "18",
                    "235,000.00",
                    "16,450.00",
                    "66,450.00",
                    "168,550.00",
                  ],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((val) => (
                      <td key={val}>{val}</td>
                    ))}
                  </tr>
                ))}
                <tr className="total-row">
                  <td>合计</td>
                  <td>117,500</td>
                  <td>7</td>
                  <td>650,000</td>
                  <td>37,625</td>
                  <td>48</td>
                  <td>12</td>
                  <td>1,505,000.00</td>
                  <td>105,350.00</td>
                  <td>755,350.00</td>
                  <td>749,650.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="notes-section">
        <div className="notes-wrapper">
          <div className="notes summary-notes">
            <h4>简要说明</h4>
            <ul>
              <li>月份：1 月到 12 月，2023 年延续。</li>
              <li>
                首存： 通常指 “首存” 或
                “首存用户”，表示当月完成首次存款的新客户或新玩家数量。
              </li>
              <li>
                首存成本：
                指公司为获取每一位首存用户所产生的成本，可能包括市场投放、优惠赠金及其他相关获客费用。
              </li>
              <li>
                首存总成本：
                由首存人数乘以单个首存成本得出，用于反映当月获取所有首存用户的总体成本。
              </li>
              <li>活跃玩家 指当月保持活跃的玩家或客户数量。</li>
              <li>人均存款： 通常表示每位活跃玩家的平均存款金额。</li>
              <li>
                人均 GGR： GGR 为 “Gross Gaming
                Revenue（毛博彩收入）”，是博彩行业常用指标，指未扣除各项成本费用前的博彩总收入。本列表示每位活跃玩家对应的平均
                GGR。
              </li>
              <li>活跃玩家总存款： 此列反映当月全部活跃玩家的存款总额。</li>
              <li>
                财务成本：
                指与公司资金运作相关的费用，如利息支出、手续费及当月发生的其他财务性支出。
              </li>
              <li>
                总成本：
                由首存总成本与财务成本相加而成，用于体现公司当月的整体成本支出。
              </li>
              <li>
                总利润：
                此列展示各月利润情况，一般为活跃玩家总存款减去总成本后的结果。
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="thankyou">
        <div className="thankyou-card thankyou-simple">
          <h2>感谢</h2>
        </div>
      </section>
    </div>
  );
}

export default App;
