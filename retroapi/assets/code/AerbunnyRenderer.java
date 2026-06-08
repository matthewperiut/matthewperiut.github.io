package com.example.example_mod;

import net.minecraft.client.render.entity.LivingEntityRenderer;
import net.minecraft.client.render.entity.model.EntityModel;
import net.minecraft.entity.LivingEntity;

import org.lwjgl.opengl.GL11;

import java.util.WeakHashMap;

/**
 * The Aerbunny's renderer, ported from aether-fabric-b1.7.3. A LivingEntityRenderer
 * already draws the model, binds the texture (from entity.texture), and applies the
 * shadow; we subclass only to add two things that depend on SERVER-SYNCED state:
 *
 *   applyScale() -> hands the model the synced puffiness so the puff cube scales.
 *   the tilt     -> rotates the whole bunny by its synced vertical velocity, so it
 *                   noses up when rising and down when falling, smoothed per entity.
 *
 * The crucial detail: both values come from the DataTracker (entity.getSyncedVelocityY
 * and entity.puffiness, which the client also fills from the tracker), NOT from any
 * field the client simulates. A client never runs the bunny's physics; it only knows
 * what the server told it. Reading the tracker is how the render matches across
 * everyone watching. See AerbunnyEntity for the publish side.
 */
public class AerbunnyRenderer extends LivingEntityRenderer {

	private final AerbunnyModel bunnyModel;
	// Smooth the tilt per entity so velocity jitter doesn't make the bunny twitch.
	private static final WeakHashMap<AerbunnyEntity, Float> smoothTilt = new WeakHashMap<>();

	public AerbunnyRenderer(EntityModel model, float shadowSize) {
		super(model, shadowSize);
		this.bunnyModel = (AerbunnyModel) model;
	}

	@Override
	protected void applyScale(LivingEntity entity, float partialTick) {
		AerbunnyEntity bunny = (AerbunnyEntity) entity;

		float velocityY = bunny.getSyncedVelocityY();
		float target;
		if (velocityY > 0.5F) {
			target = 15.0F;
		} else if (velocityY < -0.5F) {
			target = -15.0F;
		} else {
			target = velocityY * 30.0F;
		}
		float prev = smoothTilt.getOrDefault(bunny, 0.0F);
		float tilt = prev + (target - prev) * 0.3F;
		if (Math.abs(tilt) < 0.5F) {
			tilt = 0.0F;
		}
		smoothTilt.put(bunny, tilt);
		GL11.glRotatef(tilt, -1.0F, 0.0F, 0.0F);

		// Hand the synced puffiness to the model for this frame.
		this.bunnyModel.puffiness = bunny.puffiness;
	}
}
