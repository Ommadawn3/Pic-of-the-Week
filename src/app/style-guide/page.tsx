"use client";

import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { IconButton } from "@/components/atoms/IconButton";
import { RankBadge } from "@/components/atoms/RankBadge";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Tag } from "@/components/atoms/Tag";
import { TextField } from "@/components/atoms/TextField";
import { CalendarController } from "@/components/molecules/CalendarController";
import { HomeNav } from "@/components/organisms/HomeNav";
import { PolaroidPhotoCard } from "@/components/organisms/PolaroidPhotoCard";
import { ToolContainer } from "@/components/molecules/ToolContainer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-hairline pb-10">
      <h2 className="text-sm font-bold tracking-wide text-muted-2 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-10 bg-app p-6">
      <h1 className="font-marker text-2xl">Pic of the Week — Style Guide</h1>

      <Section title="Tags">
        <div className="flex flex-wrap gap-2">
          <Tag variant="leading" />
          <Tag variant="trending" />
          <Tag variant="new" />
        </div>
      </Section>

      <Section title="Rank badge">
        <div className="flex gap-2">
          <RankBadge rank={1} />
          <RankBadge rank={26} />
        </div>
      </Section>

      <Section title="Status pill">
        <div className="flex gap-2">
          <StatusPill>36 hrs left</StatusPill>
          <StatusPill>Dec 2 – 9</StatusPill>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Next</Button>
          <Button variant="secondary">Retake</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Icon buttons">
        <div className="flex gap-3">
          <IconButton aria-label="Previous">
            <Icon name="chevron" direction="left" />
          </IconButton>
          <IconButton aria-label="Comment">
            <Icon name="comment" />
          </IconButton>
          <IconButton variant="accent" aria-label="Add">
            <Icon name="add" />
          </IconButton>
          <IconButton aria-label="Share">
            <Icon name="share" />
          </IconButton>
          <IconButton aria-label="Next">
            <Icon name="chevron" direction="right" />
          </IconButton>
        </div>
      </Section>

      <Section title="Text field">
        <TextField label="First Name" />
        <TextField label="Write a caption!" maxLength={150} showCount defaultValue="Pirate arrgh bounty warp jack" />
      </Section>

      <Section title="Calendar controller">
        <CalendarController
          weeks={[
            { id: "w28", label: "Week 28", isActive: false },
            { id: "w29", label: "Week 29", isActive: false },
            { id: "w30", label: "Week 30", isActive: false },
            { id: "last", label: "Last Week", isActive: false },
            { id: "this", label: "This Week", isActive: true },
          ]}
          onSelect={() => {}}
        />
      </Section>

      <Section title="Home nav">
        <HomeNav statusLabel="36 hrs left" />
      </Section>

      <Section title="Tool container">
        <ToolContainer
          captionsHref="#"
          submitHref="#"
          onShare={() => {}}
        />
      </Section>

      <Section title="Polaroid photo card">
        <PolaroidPhotoCard
          imageUrl="/seed/sample-photo-1.png"
          rank={1}
          tag="leading"
          topCaption="Yeah... It's official. I'm high"
          authorName="Alex B"
          capturedAtLabel="Wed 7:00 PM"
        />
      </Section>
    </main>
  );
}
