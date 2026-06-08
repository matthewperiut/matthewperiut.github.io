package com.example.example_mod;

import net.minecraft.client.model.ModelPart;
import net.minecraft.client.render.entity.model.EntityModel;
import net.minecraft.util.math.MathHelper;

import org.lwjgl.opengl.GL11;

/**
 * The Aerbunny's model, ported from aether-fabric-b1.7.3
 * (https://github.com/matthewperiut/aether-fabric-b1.7.3). A model is a tree of
 * ModelParts, each a textured box with a pivot; render() draws them and setAngles()
 * poses them from the animation inputs the renderer passes in.
 *
 * The one custom touch, and the reason this mob exists in the showcase, is the puff:
 * {@link #puffiness} (set by the renderer from the entity's SERVER-SYNCED value)
 * scales the body cube up and down. Because the value is synced, every client sees the
 * same puff at the same instant, which is the entire client/server render lesson.
 */
public class AerbunnyModel extends EntityModel {

	private final ModelPart head;
	private final ModelPart earLeft;
	private final ModelPart earRight;
	private final ModelPart cheekLeft;
	private final ModelPart cheekRight;
	private final ModelPart body;
	private final ModelPart tail;
	private final ModelPart puff;
	private final ModelPart frontLegLeft;
	private final ModelPart frontLegRight;
	private final ModelPart backLegLeft;
	private final ModelPart backLegRight;

	/** Set by the renderer each frame from the entity's synced puffiness. */
	public float puffiness;

	public AerbunnyModel() {
		int y = 16;
		this.head = part(0, 0, -2.0F, -1.0F, -4.0F, 4, 4, 6, 0.0F, y - 1, -4.0F);
		this.earLeft = part(14, 0, -2.0F, -5.0F, -3.0F, 1, 4, 2, 0.0F, y - 1, -4.0F);
		this.earRight = part(14, 0, 1.0F, -5.0F, -3.0F, 1, 4, 2, 0.0F, y - 1, -4.0F);
		this.cheekLeft = part(20, 0, -4.0F, 0.0F, -3.0F, 2, 3, 2, 0.0F, y - 1, -4.0F);
		this.cheekRight = part(20, 0, 2.0F, 0.0F, -3.0F, 2, 3, 2, 0.0F, y - 1, -4.0F);
		this.body = part(0, 10, -3.0F, -4.0F, -3.0F, 6, 8, 6, 0.0F, y, 0.0F);
		this.tail = part(0, 24, -2.0F, 4.0F, -2.0F, 4, 3, 4, 0.0F, y, 0.0F);
		this.puff = part(29, 0, -3.5F, -3.5F, -3.5F, 7, 7, 7, 0.0F, 0.0F, 0.0F);
		this.frontLegLeft = part(24, 16, -2.0F, 0.0F, -1.0F, 2, 2, 2, 3.0F, y + 3, -3.0F);
		this.frontLegRight = part(24, 16, 0.0F, 0.0F, -1.0F, 2, 2, 2, -3.0F, y + 3, -3.0F);
		this.backLegLeft = part(16, 24, -2.0F, 0.0F, -4.0F, 2, 2, 4, 3.0F, y + 3, 4.0F);
		this.backLegRight = part(16, 24, 0.0F, 0.0F, -4.0F, 2, 2, 4, -3.0F, y + 3, 4.0F);
	}

	private static ModelPart part(int tx, int ty, float fx, float fy, float fz,
			int w, int h, int d, float px, float py, float pz) {
		ModelPart p = new ModelPart(tx, ty);
		p.addCuboid(fx, fy, fz, w, h, d, 0.0F);
		p.setPivot(px, py, pz);
		return p;
	}

	@Override
	public void render(float limbAngle, float limbDistance, float age, float headYaw, float headPitch, float scale) {
		this.setAngles(limbAngle, limbDistance, age, headYaw, headPitch, scale);
		this.head.render(scale);
		this.earLeft.render(scale);
		this.earRight.render(scale);
		this.cheekLeft.render(scale);
		this.cheekRight.render(scale);
		this.body.render(scale);
		this.tail.render(scale);

		// The puff: scale the body cube by the synced puffiness, centred so it grows
		// in every direction. This is the only frame-to-frame visual that depends on
		// server state, and it is driven entirely by the DataTracker value. The
		// translate of 1.0 lifts the puff (pivot 0,0,0) onto the body (pivot 0,16,0);
		// it is a whole GL unit because the surrounding matrix is at entity scale.
		GL11.glPushMatrix();
		float s = 1.0F + this.puffiness * 0.5F;
		GL11.glTranslatef(0.0F, 1.0F, 0.0F);
		GL11.glScalef(s, s, s);
		this.puff.render(scale);
		GL11.glPopMatrix();

		this.frontLegLeft.render(scale);
		this.frontLegRight.render(scale);
		this.backLegLeft.render(scale);
		this.backLegRight.render(scale);
	}

	@Override
	public void setAngles(float limbAngle, float limbDistance, float age, float headYaw, float headPitch, float scale) {
		float headPitchRad = -(headPitch / 57.29578F);
		float headYawRad = headYaw / 57.29578F;
		for (ModelPart p : new ModelPart[]{head, earLeft, earRight, cheekLeft, cheekRight}) {
			p.pitch = headPitchRad;
			p.yaw = headYawRad;
		}
		this.body.pitch = 1.570796F;
		this.tail.pitch = 1.570796F;
		this.puff.pitch = 1.570796F;
		// Legs paddle as the bunny moves.
		this.frontLegLeft.pitch = MathHelper.cos(limbAngle * 0.6662F) * limbDistance;
		this.frontLegRight.pitch = MathHelper.cos(limbAngle * 0.6662F) * limbDistance;
		this.backLegLeft.pitch = MathHelper.cos(limbAngle * 0.6662F + 3.141593F) * 1.2F * limbDistance;
		this.backLegRight.pitch = MathHelper.cos(limbAngle * 0.6662F + 3.141593F) * 1.2F * limbDistance;
	}
}
