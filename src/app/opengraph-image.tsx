import { ImageResponse } from "next/og";

export const alt = "Orbit — your day has an altitude";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

/**
 * The preview any shared Orbit link renders. Same mark, same ring, same line
 * as the product, so a pasted link already looks like the app.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0d0d0e",
          display: "flex",
          height: "100%",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: "16px" }}>
            <div
              style={{
                alignItems: "center",
                border: "5px solid rgba(163,230,53,0.35)",
                borderRadius: "50%",
                borderTopColor: "#a3e635",
                borderRightColor: "#a3e635",
                display: "flex",
                height: "44px",
                justifyContent: "center",
                transform: "rotate(-45deg)",
                width: "44px",
              }}
            >
              <div
                style={{
                  background: "#a3e635",
                  borderRadius: "50%",
                  height: "18px",
                  transform: "rotate(45deg)",
                  width: "18px",
                }}
              />
            </div>
            <div
              style={{
                color: "#f7f7f5",
                fontSize: "34px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              Orbit
            </div>
          </div>

          <div
            style={{
              color: "#f7f7f5",
              fontSize: "76px",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginTop: "44px",
            }}
          >
            Your day has an altitude.
          </div>
          <div
            style={{
              color: "#c4c7c8",
              fontSize: "30px",
              lineHeight: 1.4,
              marginTop: "28px",
              maxWidth: "620px",
            }}
          >
            Tasks, training and money as one number that climbs when you show
            up — and decays when you don’t.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: "420px",
            justifyContent: "center",
            position: "relative",
            width: "420px",
          }}
        >
          <div
            style={{
              border: "34px solid rgba(255,79,163,0.18)",
              borderRadius: "50%",
              borderTopColor: "#ff5fae",
              borderRightColor: "#ff5fae",
              height: "400px",
              transform: "rotate(-45deg)",
              width: "400px",
            }}
          />
          <div
            style={{
              border: "30px solid rgba(163,230,53,0.18)",
              borderRadius: "50%",
              borderTopColor: "#b6f24a",
              borderRightColor: "#b6f24a",
              borderBottomColor: "#b6f24a",
              height: "292px",
              position: "absolute",
              transform: "rotate(-45deg)",
              width: "292px",
            }}
          />
          <div
            style={{
              border: "26px solid rgba(96,165,250,0.18)",
              borderRadius: "50%",
              borderTopColor: "#7cc2ff",
              height: "188px",
              position: "absolute",
              transform: "rotate(-45deg)",
              width: "188px",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
